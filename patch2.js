const fs = require('fs');
let code = fs.readFileSync('public/index.html', 'utf-8');

// 1. Add touch-action: none; to #viewport, #canvas-container, .node-box
code = code.replace(/#viewport\s*{/, '#viewport {\n        touch-action: none;');
code = code.replace(/#canvas-container\s*{/, '#canvas-container {\n        touch-action: none;');
code = code.replace(/\.node-box\s*{/, '.node-box {\n        touch-action: none;');

// 2. Add UIManager.updateMenu() for Mobile Tap (inside !e.shiftKey)
const upTarget = `                } else if (!e.shiftKey) {
                  // クリックのみ: 選択 + テキスト編集開始
                  UIManager.selectOnly(id);
                  UIManager.focusToEnd(
                    Renderer.getNodeEl(id).querySelector(".node-input"),
                  );
                }`;
const upReplacement = `                } else if (!e.shiftKey) {
                  UIManager.selectOnly(id);
                  UIManager.focusToEnd(
                    Renderer.getNodeEl(id).querySelector(".node-input"),
                  );
                  UIManager.updateMenu();
                }`;
code = code.replace(upTarget, upReplacement);

// 3. Remove e.preventDefault() for background tap in setupTouchInteractions
const tapBgTarget = `            } else {
                e.preventDefault(); // ONLY prevent scroll when panning the background!
                isPanning = true;
                isNodeDragging = false;`;
const tapBgReplacement = `            } else {
                isPanning = true;
                isNodeDragging = false;`;
code = code.replace(tapBgTarget, tapBgReplacement);

fs.writeFileSync('public/index.html', code, 'utf-8');
console.log('Successfully patched index.html with patch2.js');
