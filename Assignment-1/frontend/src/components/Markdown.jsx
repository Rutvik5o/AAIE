function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="rounded bg-brand/10 text-brand px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

export default function Markdown({ text = "" }) {
  const blocks = [];
  let list = null;

  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const item = line.match(/^([-*•]|\d+[.)])\s+(.*)/);
    if (item) {
      const ordered = /\d/.test(item[1]);
      if (!list || list.ordered !== ordered) {
        list = { ordered, items: [] };
        blocks.push(list);
      }
      list.items.push(item[2]);
      return;
    }
    list = null;
    if (!line) return blocks.push({ gap: true });
    const heading = line.match(/^#{1,4}\s+(.*)/);
    blocks.push(heading ? { heading: heading[1] } : { p: line, key: i });
  });

  return (
    <div className="space-y-1.5 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.gap) return <div key={i} className="h-1" />;
        if (b.heading) return <p key={i} className="font-semibold text-fg mt-2">{inline(b.heading)}</p>;
        if (b.items) {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i} className={`${b.ordered ? "list-decimal" : "list-disc"} pl-5 space-y-1 marker:text-brand`}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </Tag>
          );
        }
        return <p key={i}>{inline(b.p)}</p>;
      })}
    </div>
  );
}
