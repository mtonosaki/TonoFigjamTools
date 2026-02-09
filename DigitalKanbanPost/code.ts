const TARGET_NAME_MARKER = "♻️";
const CHIP_PADDING = 24;
const CHIP_GAP = 16;
const INTERVAL_MS = 1000;

async function run() {
  await figma.loadAllPagesAsync();

  figma.notify(`🚀 モニター開始："${TARGET_NAME_MARKER}" で始まるセクション内の付箋を自動配置`);

  setInterval(() => {
    try {
      processKanban();
    } catch (err) {
      console.error("エラー:", err);
    }
  }, INTERVAL_MS);
}

function processKanban() {
  if (figma.currentPage.selection.length > 0) return;

  const allNodes = figma.currentPage.findAll(n => n.type === 'SECTION' || n.type === 'STICKY');

  const targetSections: SectionNode[] = [];
  const allStickies: StickyNode[] = [];

  for (const node of allNodes) {
    if (node.type === 'SECTION') {
      if (node.removed) continue;

      if (node.name.indexOf(TARGET_NAME_MARKER) === 0) {
        targetSections.push(node as SectionNode);
      }
    } else if (node.type === 'STICKY') {
      if (!node.removed) {
        allStickies.push(node as StickyNode);
      }
    }
  }

  if (targetSections.length === 0) return;

  for (const section of targetSections) {
    try {
      arrangeSection(section, allStickies);
    } catch (err) {
      console.error(`次の自動配置を無視しました→"${section.name}":`, err);
    }
  }
}

function arrangeSection(section: SectionNode, allStickies: StickyNode[]) {
  if (section.removed) return;

  const sn = section as SceneNode;

  const bX = sn.absoluteTransform[0][2];
  const bY = sn.absoluteTransform[1][2];
  const bW = sn.width;
  const bH = sn.height;

  const targets: StickyNode[] = [];

  for (const sticky of allStickies) {
    if (sticky.removed) continue;

    const sX = sticky.absoluteTransform[0][2];
    const sY = sticky.absoluteTransform[1][2];
    const sCenterX = sX + (sticky.width / 2);
    const sCenterY = sY + (sticky.height / 2);

    const isChild = sticky.parent?.id === section.id;
    const isInZone = (
      sCenterX >= bX && sCenterX <= bX + bW &&
      sCenterY >= bY && sCenterY <= bY + bH
    );
    if (isChild || isInZone) {
      targets.push(sticky);
    }
  }
  if (targets.length === 0) return;

  for (const sticky of targets) {
    if (sticky.parent?.id !== section.id) {
      section.appendChild(sticky);
    }
  }
  targets.sort((a, b) => a.y - b.y);

  const startX = CHIP_PADDING;
  let currentY = CHIP_PADDING;
  let hasMoved = false;

  for (const sticky of targets) {
    if (Math.abs(sticky.x - startX) > 1 || Math.abs(sticky.y - currentY) > 1) {
      sticky.x = startX;
      sticky.y = currentY;
      hasMoved = true;
    }
    currentY += sticky.height + CHIP_GAP;
  }

  const contentHeight = currentY + CHIP_PADDING;
  const minHeight = 200;

  if (hasMoved || Math.abs(section.height - contentHeight) > 5) {
    const newHeight = Math.max(contentHeight, minHeight);
    if (!isNaN(newHeight) && newHeight > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (section as any).resize(section.width, newHeight);
    }
  }
}

run();