/**
 * Crawlbit — HTML to Markdown Utility
 */

function htmlToMarkdown($, el) {
  let markdown = '';
  const processNode = (node) => {
    $(node).contents().each(function () {
      if (this.type === 'text') {
        markdown += this.data.replace(/\s+/g, ' ');
      } else if (this.type === 'tag') {
        const tag = this.name.toLowerCase();
        const $this = $(this);
        const content = $this.text().trim();
        if (!content && !['br', 'hr', 'img'].includes(tag)) return;

        if (/^h[1-6]$/.test(tag)) {
          const level = parseInt(tag[1], 10);
          markdown += `\n\n${'#'.repeat(level)} `;
          processNode(this);
          markdown += '\n\n';
        } else if (['p', 'div', 'article', 'section', 'main'].includes(tag)) {
          markdown += '\n\n';
          processNode(this);
          markdown += '\n\n';
        } else if (tag === 'li') {
          markdown += '\n- ';
          processNode(this);
        } else if (['strong', 'b'].includes(tag)) {
          markdown += ' **';
          processNode(this);
          markdown += '** ';
        } else if (['em', 'i'].includes(tag)) {
          markdown += ' _';
          processNode(this);
          markdown += '_ ';
        } else if (tag === 'a') {
          markdown += ' [';
          processNode(this);
          markdown += `](${$this.attr('href') || '#'}) `;
        } else if (tag === 'img') {
          const alt = $this.attr('alt') || 'image';
          const src = $this.attr('src') || '';
          if (src && !src.startsWith('data:')) {
            markdown += `\n\n![${alt}](${src})\n\n`;
          }
        } else if (tag === 'br') {
          markdown += '\n';
        } else if (tag === 'hr') {
          markdown += '\n\n---\n\n';
        } else if (['pre', 'code'].includes(tag)) {
          markdown += `\n\`\`\`\n${$this.text().trim()}\n\`\`\`\n`;
        } else if (tag === 'blockquote') {
          markdown += '\n> ';
          processNode(this);
          markdown += '\n';
        } else if (tag === 'table') {
          const rows = [];
          $this.find('tr').each((_, tr) => {
            const cells = [];
            $(tr).find('th, td').each((_, cell) => {
              cells.push($(cell).text().trim().replace(/\|/g, '\\|'));
            });
            if (cells.length > 0) rows.push(cells);
          });
          if (rows.length > 0) {
            markdown += '\n\n';
            const colCount = Math.max(...rows.map(r => r.length));
            const paddedRows = rows.map(r => {
              while (r.length < colCount) r.push('');
              return `| ${r.join(' | ')} |`;
            });
            markdown += paddedRows[0] + '\n';
            markdown += `| ${Array(colCount).fill('---').join(' | ')} |\n`;
            markdown += paddedRows.slice(1).join('\n');
            markdown += '\n\n';
          }
        } else {
          processNode(this);
        }
      }
    });
  };

  processNode(el);
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
}

function resolveUrl(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function getDomain(u) {
  try {
    return new URL(u).hostname;
  } catch {
    return '';
  }
}

function getBaseDomain(u) {
  const h = getDomain(u);
  const p = h.split('.');
  return p.length > 2 ? p.slice(-2).join('.') : h;
}

module.exports = {
  htmlToMarkdown,
  resolveUrl,
  getDomain,
  getBaseDomain,
};
