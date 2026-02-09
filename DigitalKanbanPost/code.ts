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

  for (const node of allNodes.filter(n => !n.removed)) {
    if (node.type === 'SECTION') {
      if (node.name.trim().startsWith(TARGET_NAME_MARKER)) {
        targetSections.push(node as SectionNode);
      }
    } else if (node.type === 'STICKY') {
      allStickies.push(node as StickyNode);
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

  const sectionNode = section as SceneNode;
  const sectionX = sectionNode.absoluteTransform[0][2];
  const sectionY = sectionNode.absoluteTransform[1][2];
  const sectionWidth = sectionNode.width;
  const sectionHeight = sectionNode.height;
  const targets: StickyNode[] = [];

  for (const sticky of allStickies.filter(n => !n.removed)) {
    const stickyX = sticky.absoluteTransform[0][2];
    const stickyY = sticky.absoluteTransform[1][2];
    const stickyCenterX = stickyX + (sticky.width / 2);
    const stickyCenterY = stickyY + (sticky.height / 2);

    const isChild = sticky.parent?.id === section.id;
    const isInZone = (
      stickyCenterX >= sectionX && stickyCenterX <= sectionX + sectionWidth &&
      stickyCenterY >= sectionY && stickyCenterY <= sectionY + sectionHeight
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