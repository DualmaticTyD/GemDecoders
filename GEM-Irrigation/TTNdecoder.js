/**
 * Payload decoder for The Things Network
 * 
 * Copyright Dual Matic Tecnología y Desarrollo S.L.
 * @version 0.0
 * 
 * @product GEM V2
 * 
 */


function Decoder(bytes, port) {
    return gem(bytes);
}

function gem(bytes) {
    var decoded = {};
    
    for (var i = 0; i < bytes.length; ) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
    
    //Bitmap (Valve status) decoded as int
    if (channel_id === 0x01 && channel_type === 0x95) {
            decoded.valvestatus = (bytes[i] << 8) + bytes[i+1];
            i += 1;
    } else {
        break;
    }
    return decoded;
  }
}
