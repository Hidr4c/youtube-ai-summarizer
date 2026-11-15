/**
 * Protobuf binary encoding helpers for YouTube InnerTube parameter synthesis
 */
export class ProtobufHelper {
  /**
   * Encodes variable integer according to protobuf specifications
   * @param {number} val
   * @returns {number[]}
   */
  static encodeVarint(val) {
    const bytes = [];
    let v = val;
    while (v > 127) {
      bytes.push((v & 127) | 128);
      v >>>= 7;
    }
    bytes.push(v & 127);
    return bytes;
  }

  /**
   * Encodes a length-delimited protobuf field (string or byte array)
   * @param {number} fieldNumber
   * @param {string|number[]} strOrBytes
   * @returns {number[]}
   */
  static encodeField(fieldNumber, strOrBytes) {
    const bytes = typeof strOrBytes === 'string'
      ? Array.from(new TextEncoder().encode(strOrBytes))
      : strOrBytes;
    const tag = (fieldNumber << 3) | 2;
    return [...ProtobufHelper.encodeVarint(tag), ...ProtobufHelper.encodeVarint(bytes.length), ...bytes];
  }

  /**
   * Synthesizes valid protobuf params string for legacy InnerTube get_transcript API
   * @param {string} videoId
   * @param {string} [lang='']
   * @param {string} [kind='asr']
   * @returns {string|null}
   */
  static generateTranscriptParams(videoId, lang = '', kind = 'asr') {
    if (!videoId) return null;
    const inner = [];
    if (kind) inner.push(...ProtobufHelper.encodeField(1, kind));
    if (lang) inner.push(...ProtobufHelper.encodeField(2, lang));

    const outer = [
      ...ProtobufHelper.encodeField(1, videoId),
      ...(inner.length > 0 ? ProtobufHelper.encodeField(2, inner) : [])
    ];
    let binary = '';
    for (let i = 0; i < outer.length; i++) binary += String.fromCharCode(outer[i]);
    return btoa(binary);
  }

  /**
   * Synthesizes deterministic protobuf params for modern InnerTube get_panel API (PAmodern_transcript_view)
   * Field 149 = { field 1: videoId, field 3: 1 }
   * @param {string} videoId
   * @returns {string|null}
   */
  static generateModernTranscriptPanelParams(videoId) {
    if (!videoId) return null;
    const idBytes = Array.from(new TextEncoder().encode(videoId));
    const inner = [
      0x0a, idBytes.length, ...idBytes,
      0x18, 0x01
    ];
    const outer = [
      170, 9, inner.length, ...inner
    ];
    let binary = '';
    for (let i = 0; i < outer.length; i++) binary += String.fromCharCode(outer[i]);
    return btoa(binary);
  }
}

export default ProtobufHelper;
