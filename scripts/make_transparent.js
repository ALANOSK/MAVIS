import { Jimp } from 'jimp';

async function run() {
  try {
    console.log("Reading image public/lion-group.png...");
    const image = await Jimp.read('public/lion-group.png');
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const data = image.bitmap.data; // Uint8Array or Buffer of size width * height * 2
    
    console.log(`Image loaded. Dimensions: ${width}x${height}. Data size: ${data.length} bytes`);
    
    // We will do a flood fill BFS starting from the border pixels to find connected white-ish pixels.
    const visited = new Uint8Array(width * height);
    const queue = [];
    
    function isWhiteish(r, g, b) {
      return r > 230 && g > 230 && b > 230;
    }
    
    function getPixel(x, y) {
      const idx = (y * width + x) * 4;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
      };
    }
    
    function addEdgePixel(x, y) {
      const idx = y * width + x;
      if (visited[idx]) return;
      
      const p = getPixel(x, y);
      if (isWhiteish(p.r, p.g, p.b)) {
        visited[idx] = 1;
        queue.push({ x, y });
      }
    }
    
    // Seed queue with border pixels
    for (let x = 0; x < width; x++) {
      addEdgePixel(x, 0);
      addEdgePixel(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      addEdgePixel(0, y);
      addEdgePixel(width - 1, y);
    }
    
    console.log(`Starting BFS. Seed queue size: ${queue.length}`);
    
    let processedCount = 0;
    let head = 0;
    
    while (head < queue.length) {
      const { x, y } = queue[head++];
      
      // Make this pixel transparent (set Alpha = 0)
      const dataIdx = (y * width + x) * 4;
      data[dataIdx + 3] = 0;
      processedCount++;
      
      // Check 4-way neighbors
      const neighbors = [
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      ];
      
      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          const nIdx = n.y * width + n.x;
          if (!visited[nIdx]) {
            const p = getPixel(n.x, n.y);
            // Neighbor is white-ish
            if (isWhiteish(p.r, p.g, p.b)) {
              visited[nIdx] = 1;
              queue.push(n);
            }
          }
        }
      }
    }
    
    console.log(`Flood fill complete. Modified ${processedCount} pixels.`);
    
    // Also, let's do a simple full sweep for any remaining single isolated white pixels (like very close to borders)
    // just to clean it up perfectly. If any pixel has R > 245, G > 245, B > 245, we can make it transparent,
    // as the logo itself has no solid pure white parts.
    let sweepCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      const a = data[i+3];
      
      if (a > 0 && r > 245 && g > 245 && b > 245) {
        data[i+3] = 0;
        sweepCount++;
      }
    }
    console.log(`Sweep cleaned up ${sweepCount} additional pure white pixels.`);
    
    // Save image
    await image.write('public/lion-group.png');
    console.log("Successfully saved transparent PNG!");
  } catch (error) {
    console.error("Error making image transparent:", error);
  }
}

run();
