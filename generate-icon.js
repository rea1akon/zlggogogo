const fs = require('fs');
const path = require('path');

function createIcoFile() {
    const icoPath = path.join(__dirname, 'icon.ico');
    
    const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const IHDR = Buffer.from([
        0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x40,
        0x00, 0x00, 0x00, 0x40,
        0x08, 0x02, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x90
    ]);
    const crc32 = (data) => {
        let table = new Int32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
            table[i] = c;
        }
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        return (crc ^ 0xFFFFFFFF) >>> 0;
    };
    const writeInt32BE = (val) => {
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(val, 0);
        return buf;
    };
    
    const size = 64;
    const pixels = Buffer.alloc(size * size * 4);
    const cx = size / 2, cy = size / 2, r = size / 2 - 4;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= r) {
                pixels[idx] = 59;
                pixels[idx + 1] = 130;
                pixels[idx + 2] = 246;
                pixels[idx + 3] = 255;
            } else {
                pixels[idx] = 15;
                pixels[idx + 1] = 23;
                pixels[idx + 2] = 42;
                pixels[idx + 3] = 255;
            }
        }
    }
    
    const rawData = Buffer.alloc(size * (1 + size));
    for (let y = 0; y < size; y++) {
        rawData[y * (size + 1)] = 0;
        for (let x = 0; x < size; x++) {
            const pidx = (y * size + x) * 4;
            rawData[y * (size + 1) + 1 + x] = Math.round(0.299 * pixels[pidx] + 0.587 * pixels[pidx+1] + 0.114 * pixels[pidx+2]);
        }
    }
    
    function zlibDeflate(buf) {
        try {
            const zlib = require('zlib');
            return zlib.deflateSync(buf);
        } catch(e) {
            return buf;
        }
    }
    
    const idatData = zlibDeflate(pixels);
    const idatChunk = Buffer.concat([Buffer.from('IDAT'), idatData]);
    const idatCrc = crc32(Buffer.concat([idatChunk]));
    
    const iendChunk = Buffer.from('IEND');
    const iendCrc = crc32(iendChunk);
    
    const png = Buffer.concat([
        PNG_HEADER,
        Buffer.from([0x00, 0x00, 0x00, 0x0D]), IHDR,
        writeInt32BE(crc32(IHDR)),
        writeInt32BE(idatData.length), idatChunk,
        writeInt32BE(idatCrc),
        Buffer.from([0x00, 0x00, 0x00, 0x00]), iendChunk,
        writeInt32BE(iendCrc)
    ]);
    
    const icoHeader = Buffer.alloc(22);
    icoHeader.writeUInt16LE(0, 0);
    icoHeader.writeUInt16LE(1, 2);
    icoHeader.writeUInt16LE(1, 4);
    icoHeader.writeUInt8(size, 6);
    icoHeader.writeUInt8(size, 7);
    icoHeader.writeUInt8(0, 8);
    icoHeader.writeUInt8(0, 9);
    icoHeader.writeUInt16LE(1, 10);
    icoHeader.writeUInt16LE(32, 12);
    icoHeader.writeUInt32LE(png.length, 14);
    icoHeader.writeUInt32LE(22, 18);
    
    fs.writeFileSync(icoPath, Buffer.concat([icoHeader, png]));
    console.log('icon.ico created successfully at:', icoPath);
}

createIcoFile();
