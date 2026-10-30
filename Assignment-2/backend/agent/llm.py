"""Thin wrapper around the Groq chat API with retry on rate limits and optional streaming."""
import time

from groq import BadRequestError, Groq, RateLimitError

import config


class LLM:
    def __init__(self, model=config.GROQ_MODEL):
        if not config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is missing. Add it to backend/.env")
        self.client = Groq(api_key=config.GROQ_API_KEY)
        self.model = model
        self.rate_limit_wait_s = 0.0  # total time spent waiting on rate limits (reported in traces)

    def _create(self, **kwargs):
        for attempt in range(4):
            try:
                return self.client.chat.completions.create(
                    model=self.model, tool_choice="auto", temperature=0.1, **kwargs
                )
            except RateLimitError as e:
                wait = float(e.response.headers.get("retry-after", 5 * (attempt + 1)))
                self.rate_limit_wait_s += wait
                time.sleep(wait)
            except BadRequestError:  # model produced a malformed tool call; ask again
                if attempt == 3:
                    raise
        raise RuntimeError("Groq rate limit: please wait a moment and retry.")

    def chat(self, messages: list[dict], tools: list[dict], on_token=None):
        """Returns (assistant_message_dict, usage_dict).
        If on_token is given, the answer is streamed and on_token(text) is called for each piece."""
        if on_token:
            return self._stream(messages, tools, on_token)

        response = self._create(messages=messages, tools=tools)
        msg = response.choices[0].message
        message = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            message["tool_calls"] = [
                {"id": c.id, "type": "function", "function": {"name": c.function.name, "arguments": c.function.arguments}}
                for c in msg.tool_calls
            ]
        usage = {"input": response.usage.prompt_tokens, "output": response.usage.completion_tokens}
        return message, usage

    def _stream(self, messages, tools, on_token):
        content, calls, usage = "", {}, {"input": 0, "output": 0}
        for chunk in self._create(messages=messages, tools=tools, stream=True):
            if chunk.choices:
                delta = chunk.choices[0].delta
                if delta.content:
                    content += delta.content
                    on_token(delta.content)
                for tc in delta.tool_calls or []:  # tool calls can arrive in pieces
                    call = calls.setdefault(tc.index, {"id": "", "type": "function", "function": {"name": "", "arguments": ""}})
                    call["id"] = tc.id or call["id"]
                    if tc.function:
                        call["function"]["name"] += tc.function.name or ""
                        call["function"]["arguments"] += tc.function.arguments or ""
            groq_usage = getattr(getattr(chunk, "x_groq", None), "usage", None)
            if groq_usage:
                usage = {"input": groq_usage.prompt_tokens, "output": groq_usage.completion_tokens}

        message = {"role": "assistant", "content": content}
        if calls:
            message["tool_calls"] = [calls[i] for i in sorted(calls)]
        return message, usage
