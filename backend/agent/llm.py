"""Thin wrapper around the Groq chat API with retry on rate limits."""
import time

from groq import BadRequestError, Groq, RateLimitError

import config


class LLM:
    def __init__(self, model=config.GROQ_MODEL):
        if not config.GROQ_API_KEY:
            raise RuntimeError("GROQ_API_KEY is missing. Add it to backend/.env")
        self.client = Groq(api_key=config.GROQ_API_KEY)
        self.model = model

    def chat(self, messages: list[dict], tools: list[dict]):
        """Returns (assistant_message_dict, usage_dict)."""
        for attempt in range(4):
            try:
                response = self.client.chat.completions.create(
                    model=self.model, messages=messages, tools=tools, tool_choice="auto", temperature=0.1
                )
                break
            except RateLimitError:
                time.sleep(5 * (attempt + 1))
            except BadRequestError:  # model produced a malformed tool call; ask again
                if attempt == 3:
                    raise
        else:
            raise RuntimeError("Groq rate limit: please wait a moment and retry.")

        msg = response.choices[0].message
        message = {"role": "assistant", "content": msg.content or ""}
        if msg.tool_calls:
            message["tool_calls"] = [
                {"id": c.id, "type": "function", "function": {"name": c.function.name, "arguments": c.function.arguments}}
                for c in msg.tool_calls
            ]
        usage = {"input": response.usage.prompt_tokens, "output": response.usage.completion_tokens}
        return message, usage
