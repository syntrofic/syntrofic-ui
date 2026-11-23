figma.showUI(__html__, { width: 400, height: 360, themeColors: true });

function rgb(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return { r: parseInt(value.slice(1, 3), 16) / 255, g: parseInt(value.slice(3, 5), 16) / 255, b: parseInt(value.slice(5, 7), 16) / 255 };
}
function metric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

async function synchronize(theme) {
  if (!theme || theme.version !== 1 || typeof theme.id !== 'string' || !/^[a-z0-9-]+$/.test(theme.id) || !theme.modes)
    throw new Error('请选择有效的 Syntrofic manifest.json');
  const name = 'Syntrofic / ' + theme.id;
  const existing = await figma.variables.getLocalVariableCollectionsAsync();
  const collection = existing.find(item => item.name === name) || figma.variables.createVariableCollection(name);
  const first = collection.defaultModeId;
  if (!collection.modes.some(item => item.name === 'Light')) collection.renameMode(first, 'Light');
  const light = collection.modes.find(item => item.name === 'Light').modeId;
  let dark = collection.modes.find(item => item.name === 'Dark')?.modeId;
  const notes = [];
  if (!dark) {
    try { dark = collection.addMode('Dark'); }
    catch { notes.push('当前 Figma 文件的变量模式限制了深色模式。'); }
  }
  const known = await figma.variables.getLocalVariablesAsync();
  let count = 0;
  function apply(label, type, day, night) {
    if (day == null && night == null) return;
    const variable = known.find(item => item.variableCollectionId === collection.id && item.name === label && item.resolvedType === type)
      || figma.variables.createVariable(label, collection, type);
    variable.setValueForMode(light, day ?? night);
    if (dark) variable.setValueForMode(dark, night ?? day);
    count++;
  }
  const day = theme.modes.light || {};
  const night = theme.modes.dark || {};
  for (const key of [...new Set([...Object.keys(day), ...Object.keys(night)])].filter(key => /^[a-z-]{1,48}$/.test(key)))
    apply('color/' + key, 'COLOR', rgb(day[key]), rgb(night[key]));
  for (const key of ['radius', 'spacing', 'fontSize', 'borderWidth'])
    apply('size/' + key, 'FLOAT', metric(theme[key]), metric(theme[key]));
  if (theme.font) notes.push('字体需在 Figma 文本样式中选择。');
  if (theme.shadow === 'soft') notes.push('阴影需作为效果样式设置。');
  return { count, notes };
}
async function generateKit(kit) {
  if (!Array.isArray(kit.components) || kit.components.length > 260) throw new Error('组件数量不合法。');
  const tracks = ['web','web-pro','native','native-pro'];
  await figma.loadFontAsync({family:'Inter',style:'Regular'});
  function paint(node, hex) { node.fills = [{type:'SOLID',color:rgb(hex)}]; }
  function text(label, size, tone) {
    const node=figma.createText();
    node.fontName={family:'Inter',style:'Regular'};
    node.fontSize=size;
    node.characters=label;
    paint(node,tone);
    return node;
  }
  function tile(container, width, height, fill) {
    const box=figma.createRectangle();
    box.resize(width,height);
    box.cornerRadius=Math.min(7,height/2);
    paint(box,fill);
    container.appendChild(box);
    return box;
  }
  const existing = figma.root.children;
  let created = 0;
  for (const track of tracks) {
    const name='Syntrofic / '+track;
    if (existing.some(page=>page.name===name)) continue;
    const page=figma.createPage();
    page.name=name;
    await figma.setCurrentPageAsync(page);
    const list=kit.components.filter(entry=>entry.track===track);
    for (const [index,entry] of list.entries()) {
      if (typeof entry.id!=='string'||typeof entry.name!=='string') continue;
      const variants=[];
      for (const mode of ['Light','Dark']) {
        const color=mode==='Light'?{surface:'#f6f2eb',ink:'#2b302b',accent:'#425849',line:'#d4dfd2'}:
          {surface:'#2a2825',ink:'#f2ede6',accent:'#a8bda9',line:'#435749'};
        const component=figma.createComponent();
        component.name='Appearance='+mode;
        component.layoutMode=entry.shape==='action'?'HORIZONTAL':'VERTICAL';
        component.primaryAxisSizingMode='AUTO';
        component.counterAxisSizingMode='AUTO';
        component.paddingLeft=component.paddingRight=12;
        component.paddingTop=component.paddingBottom=9;
        component.itemSpacing=7;
        component.cornerRadius=13;
        component.setPluginData('syntrofic-id',entry.id);
        paint(component,entry.shape==='action'?color.line:color.surface);
        component.appendChild(text(entry.name,14,color.ink));
        if (entry.shape==='field') tile(component,150,22,color.line);
        if (entry.shape==='collection') {
          for (const size of [165,130,150]) tile(component,size,11,color.line);
        }
        if (entry.shape==='calendar'||entry.shape==='chart') {
          const row=figma.createFrame();
          row.layoutMode='HORIZONTAL';
          row.primaryAxisSizingMode='AUTO';
          row.counterAxisSizingMode='AUTO';
          row.itemSpacing=5;
          row.fills=[];
          for (let i=0;i<7;i++) tile(row,entry.shape==='calendar'?19:12,entry.shape==='calendar'?19:12+(i*13)%54,color.accent);
          component.appendChild(row);
        }
        if (entry.shape==='surface') tile(component,159,17,color.line);
        variants.push(component);
      }
      const set=figma.combineAsVariants(variants,page);
      set.name=entry.name;
      set.description=[entry.id,entry.code,entry.reviewNumber].filter(Boolean).join(' · ');
      set.setPluginData('syntrofic-id',entry.id);
      set.x=(index%4)*260;
      set.y=Math.floor(index/4)*210;
      created++;
    }
  }
  return {count:created, notes:['已存在的发行线页面保留。']};
}
figma.ui.onmessage = async message => {
  if (!message || message.type !== 'sync') return;
  try {
    const result = message.theme?.kind === 'syntrofic-design-kit' ? await generateKit(message.theme) : await synchronize(message.theme);
    figma.ui.postMessage({ type: 'done', ...result });
  } catch (error) {
    figma.ui.postMessage({ type: 'error', message: String(error.message ?? error) });
  }
};
