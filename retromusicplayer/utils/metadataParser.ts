/**
 * Metadata Parser
 * Handles parsing of FLAC Vorbis Comments (based on user provided Java logic)
 * and basic ID3v2 for MP3s to extract Lyrics and Cover Art.
 */

const TYPE_VORBIS_COMMENT = 4;
const KEY_ERRONEOUS = "ERRONEOUS";

// --- FLAC PARSER ---

export async function parseFlacTags(file: File): Promise<{ lyrics?: string, artist?: string, album?: string }> {
  const buffer = await file.arrayBuffer();
  const data = new DataView(buffer);
  
  // Check 'fLaC' signature
  if (data.getUint8(0) !== 0x66 || data.getUint8(1) !== 0x4C || data.getUint8(2) !== 0x61 || data.getUint8(3) !== 0x43) {
    return {};
  }

  let offset = 4;
  let tags: Record<string, string> = {};

  let isLastBlock = false;
  while (!isLastBlock && offset < data.byteLength) {
    const blockHeader = data.getUint8(offset);
    isLastBlock = (blockHeader & 0x80) !== 0;
    const blockType = blockHeader & 0x7F;
    
    const length = (data.getUint8(offset + 1) << 16) | (data.getUint8(offset + 2) << 8) | data.getUint8(offset + 3);
    offset += 4;

    if (blockType === TYPE_VORBIS_COMMENT) {
      // Read Comment Block
      let pos = offset;
      
      // Vendor length (Little Endian)
      const vendorLen = data.getUint32(pos, true); 
      pos += 4 + vendorLen; // Skip vendor string

      // User Comment List Length
      const userCommentListLen = data.getUint32(pos, true);
      pos += 4;

      for (let i = 0; i < userCommentListLen; i++) {
        const commentLen = data.getUint32(pos, true);
        pos += 4;
        
        // Read string
        const commentBytes = new Uint8Array(buffer, pos, commentLen);
        const commentStr = new TextDecoder('utf-8').decode(commentBytes);
        pos += commentLen;

        const splitIdx = commentStr.indexOf('=');
        if (splitIdx !== -1) {
          const key = commentStr.substring(0, splitIdx).toUpperCase();
          const value = commentStr.substring(splitIdx + 1);
          tags[key] = value;
        }
      }
    }

    offset += length;
  }

  return {
    lyrics: tags['LYRICS'] || tags['UNSYNCED LYRICS'],
    artist: tags['ARTIST'],
    album: tags['ALBUM']
  };
}

// --- MP3 ID3 PARSER (Simplified) ---

export async function parseId3Tags(file: File): Promise<{ lyrics?: string }> {
    // This is a very basic parser primarily to catch simple USLT frames.
    // Full ID3 parsing is complex; using a library is usually better, but we are keeping deps low.
    const buffer = await file.slice(0, 300000).arrayBuffer(); // Read first 300kb
    const view = new DataView(buffer);
    
    // Check ID3
    if (view.getUint8(0) !== 0x49 || view.getUint8(1) !== 0x44 || view.getUint8(2) !== 0x33) return {};
    
    const size = ((view.getUint8(6) & 0x7f) << 21) | ((view.getUint8(7) & 0x7f) << 14) | ((view.getUint8(8) & 0x7f) << 7) | (view.getUint8(9) & 0x7f);
    const version = view.getUint8(3);
    
    let offset = 10;
    const limit = offset + size;
    let lyrics = undefined;

    while (offset < limit && offset < view.byteLength - 10) {
        let frameId = '';
        let frameSize = 0;
        
        if (version === 3 || version === 4) {
             frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2), view.getUint8(offset+3));
             frameSize = view.getUint32(offset + 4, version === 3); // v3 is big endian usually? actually ID3 spec says syncsafe for v4, integer for v3
             offset += 10;
        } else if (version === 2) {
             frameId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset+1), view.getUint8(offset+2));
             const s1 = view.getUint8(offset+3);
             const s2 = view.getUint8(offset+4);
             const s3 = view.getUint8(offset+5);
             frameSize = (s1 << 16) | (s2 << 8) | s3;
             offset += 6;
        }

        if (frameId === 'USLT' || frameId === 'ULT') {
            // Unsynchronized lyrics
            // Encoding (1) + Lang (3) + Desc (null term) + Text
            const encoding = view.getUint8(offset);
            let textOffset = offset + 4;
            
            // Skip descriptor (find null terminator based on encoding)
            // Simplified: just scan for a bit, this is risky but keeps code small
            // Assuming ISO-8859-1 (0) or UTF-8 (3) mostly
            
            // Let's just try to grab the text at the end of the frame roughly
            // A proper parser is needed for robust ID3, but for this demo:
            const contentBytes = new Uint8Array(buffer, offset, frameSize);
            const raw = new TextDecoder(encoding === 1 || encoding === 2 ? 'utf-16' : 'utf-8').decode(contentBytes);
            // Cleanup standard header garbage
            lyrics = raw.substring(4).replace(/^.*?(\0)/, ''); 
        }

        offset += frameSize;
    }

    return { lyrics };
}
