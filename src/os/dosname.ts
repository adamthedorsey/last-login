/** Win95-style 8.3 alias: "wv history extra notes.txt" -> "WVHIST~1.TXT". */
export function dosShortName(name: string, isDir: boolean): string {
  const dot = isDir ? -1 : name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3) : '';
  const stem = base.length > 8 ? `${base.slice(0, 6)}~1` : base || 'FILE';
  return ext ? `${stem}.${ext}` : stem;
}
