const enabled = !Object.hasOwn(process.env, 'NO_COLOR') && process.env.TERM !== 'dumb' && (Boolean(process.stdout.isTTY) || process.env.FORCE_COLOR === '1');
const paint = (code, value) => enabled ? `\x1b[${code}m${value}\x1b[0m` : String(value);
const c = { cyan: s=>paint('36',s), blue: s=>paint('94',s), green: s=>paint('32',s), yellow: s=>paint('33',s), red: s=>paint('31',s), muted: s=>paint('90',s), bold: s=>paint('1',s) };
const line = '─'.repeat(56);
module.exports = {
  title(text) { console.log('\n'+c.cyan(line)+'\n  '+c.bold(c.cyan(text))+'\n'+c.muted('  SAMSUNG STAGING  /  Chrome + Playwright')+'\n'+c.cyan(line)); },
  menu(items) { for(const [key,label] of items)console.log('  '+c.bold(c.blue('['+key+']'))+'  '+label);console.log(); },
  question(text) { return c.cyan('  › ')+c.bold(text)+' '; },
  info(text) { console.log(c.blue('  i ')+text); },
  step(text) { console.log('\n'+c.bold(c.cyan('  ▶ '+text))); },
  success(text) { console.log(c.green('  ✓ ')+text); },
  warn(text) { console.warn(c.yellow('  ! ')+text); },
  error(text) { console.error(c.red('  ✗ ')+text); },
  product(sku,quantity) { console.log('    '+c.bold(sku)+'  '+c.cyan('× '+quantity)); },
  total(text) { console.log('\n  '+c.bold(c.green('TỔNG: '+text))+'\n'+c.muted(line)); },
  section(text) { console.log('\n'+c.bold(text)+'\n'+c.muted(line)); }
};
