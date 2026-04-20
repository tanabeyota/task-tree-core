const fs = require('fs');

const code = fs.readFileSync('public/index.html', 'utf-8');

const newFunc = `      function setupTouchInteractions() {
        let touchStartDist = 0;
        let isPinchZooming = false;
        let isPanning = false;
        let isNodeDragging = false;
        let startPanX = 0, startPanY = 0;
        let startCanvasX = 0, startCanvasY = 0;

        DOM.viewport.addEventListener("touchstart", (e) => {
          if (e.touches.length === 2 && e.target.closest("#viewport")) {
            e.preventDefault();
            if (isNodeDragging && DragAndDropSubsystem.__activeDragUp) {
                DragAndDropSubsystem.__activeDragUp({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
            isPinchZooming = true;
            isPanning = false;
            isNodeDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDist = Math.hypot(dx, dy);
            window.rightDragStartScale = State.canvasScale;
          } else if (e.touches.length === 1) {
            const el = e.target.closest(".node-box");
            
            if (e.target.tagName === "BUTTON" || e.target.classList.contains("resize-edge-right")) return;

            if (el) {
                // DO NOT preventDefault! Allow native focus to work on iOS!
                isNodeDragging = true;
                isPanning = false;

                const mockEvent = {
                    preventDefault: () => { if (e.cancelable) e.preventDefault(); },
                    stopPropagation: () => { e.stopPropagation(); },
                    clientX: e.touches[0].clientX,
                    clientY: e.touches[0].clientY,
                    button: 0,
                    target: el,
                    shiftKey: false,
                    altKey: false
                };
                DragAndDropSubsystem.startNodeDragSession(mockEvent, el);
                
                startPanX = e.touches[0].clientX;
                startPanY = e.touches[0].clientY;
            } else {
                e.preventDefault(); // ONLY prevent scroll when panning the background!
                isPanning = true;
                isNodeDragging = false;
                startPanX = e.touches[0].clientX;
                startPanY = e.touches[0].clientY;
                startCanvasX = State.canvasX;
                startCanvasY = State.canvasY;
            }
          }
        }, {passive: false});

        window.addEventListener("touchmove", (e) => {
          if (isPinchZooming && e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.hypot(dx, dy);
            const baseScale = window.rightDragStartScale || State.canvasScale;
            let ns = baseScale * (dist / touchStartDist);
            ns = Math.max(0.005, Math.min(ns, 50));

            const mx = window.innerWidth / 2;
            const my = window.innerHeight / 2;
            State.canvasX = mx - ((mx - State.canvasX) * ns) / State.canvasScale;
            State.canvasY = my - ((my - State.canvasY) * ns) / State.canvasScale;
            State.canvasScale = ns;
            UIManager.updateTransform();
            UIManager.updateTheme();
          } else if (isPanning && e.touches.length === 1) {
            e.preventDefault();
            State.canvasX = startCanvasX + (e.touches[0].clientX - startPanX);
            State.canvasY = startCanvasY + (e.touches[0].clientY - startPanY);
            UIManager.updateTransform();
            UIManager.updateTheme();
          } else if (isNodeDragging) {
             e.preventDefault();
             if (DragAndDropSubsystem.__activeDragMove) {
                 DragAndDropSubsystem.__activeDragMove({
                     clientX: e.touches[0].clientX,
                     clientY: e.touches[0].clientY,
                 });
             }
          }
        }, {passive: false});

        const cancelOrEndDrag = (e) => {
           if (isNodeDragging) {
             if (DragAndDropSubsystem.__activeDragUp) {
                 DragAndDropSubsystem.__activeDragUp({
                     clientX: e.changedTouches?.[0]?.clientX || startPanX,
                     clientY: e.changedTouches?.[0]?.clientY || startPanY,
                 });
             }
             isNodeDragging = false;
           }
        };

        window.addEventListener("touchend", (e) => {
          cancelOrEndDrag(e);
          if (e.touches.length < 2 && isPinchZooming) {
            isPinchZooming = false;
          }
          if (e.touches.length === 0 && isPanning) {
            isPanning = false;
          }
        });

        window.addEventListener("touchcancel", (e) => {
          cancelOrEndDrag(e);
          if (e.touches.length < 2 && isPinchZooming) {
            isPinchZooming = false;
          }
          if (e.touches.length === 0 && isPanning) {
            isPanning = false;
          }
        });
      }`;

const startMarker = '      function setupTouchInteractions() {';
const endMarker = '      function setupCanvasInteractions() {';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newCode = code.substring(0, startIndex) + newFunc + '\n\n' + code.substring(endIndex);
    fs.writeFileSync('public/index.html', newCode, 'utf-8');
    console.log('Successfully patched index.html');
} else {
    console.log('Error: Markers not found.');
}
