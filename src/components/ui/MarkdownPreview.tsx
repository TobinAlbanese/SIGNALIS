function inline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function MarkdownPreview({ body }: { body: string }) {
  const html = body
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${inline(line.slice(2))}</h1>`;
      if (line.startsWith('## ')) return `<h2>${inline(line.slice(3))}</h2>`;
      if (line.startsWith('- [ ] ')) return `<p><input type="checkbox" disabled />${inline(line.slice(6))}</p>`;
      if (line.startsWith('- [x] ')) return `<p><input type="checkbox" checked disabled />${inline(line.slice(6))}</p>`;
      if (line.startsWith('- ')) return `<p>&bull; ${inline(line.slice(2))}</p>`;
      return line.trim() ? `<p>${inline(line)}</p>` : '<br />';
    })
    .join('');

  return <div className="markdown-body text-sm text-[color:var(--c-text-secondary)]" dangerouslySetInnerHTML={{ __html: html }} />;
}
