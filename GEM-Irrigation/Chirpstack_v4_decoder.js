/**
 * Chirpstack v4 Payload decoder for GEM devices
 * 
 * Copyright Dual Matic Tecnología y Desarrollo S.L.
 * @version 0.6
 * 
 * @product GEM V2
 * 
 */

// Decode uplink function.
  //
  // Input is an object with the following fields:
  // - bytes = Byte array containing the uplink payload, e.g. [255, 230, 255, 0]
  // - fPort = Uplink fPort.
  // - variables = Object containing the configured device variables.
  //
  // Output must be an object with the following fields:
// - data = Object representing the decoded payload.


function decodeUplink(input) {
  let bytes = input.bytes;
  let port = input.fPort;
  let decoded = {};
  
  decoded.bytes = bytes;
  
  ain_chns = [0x05, 0x06];
  din_chns = [0x01, 0x02];
  volt_chns = [0x08, 0x09];
  cnt_mult = 10;
  volt_mult = 100;

  if (port === 1) {
    decoded.ch_status = [];
    for (let i = 0; i < bytes.length; ) {
      let channel_id = bytes[i++];
      let channel_type = bytes[i++];
      
      // Latching solenoid outputs as bitmap
      if (channel_id === 0x01 && channel_type === 0x95) {
        decoded.valvemask = (bytes[i] << 8) + bytes[i+1];
		for (let z = 0; z < 16;) {
        	decoded.ch_status[z] = getBit(decoded.valvemask, z) ? "true" : "false";
        	z += 1;
      	}
      i += 2; //2 bytes size
      }
      // ADC (Analog inputs)
      else if (includes(ain_chns, channel_id) && channel_type === 0x02) {
        var adc_channel_name = "ain_" + (channel_id - ain_chns[0] + 1);
	    decoded[adc_channel_name] = (bytes[i] << 8 | + bytes[i+1]) / 100;
        //decoded[adc_channel_name] = readInt16LE(bytes.slice(i, i + 2)) / 100;
        i += 2; //2 bytes size
      }

      //Digital input as dry contact
      else if (includes(din_chns, channel_id) && (channel_type === 0x00)) {
        var din_channel_name = "din_" + (channel_id - din_chns[0] + 1);
        decoded[din_channel_name] = bytes[i] === 0 ? "low" : "high";
        i += 1; //1 byte size
      }

      //Digital input as Pulse Counter
      else if (includes(din_chns, channel_id) && channel_type === 0xC8) {
        var din_channel_name = "counter_" + (channel_id - din_chns[0] +1);
        decoded[din_channel_name] = readUInt32BE(bytes.slice(i, i + 4)) / cnt_mult;
        i += 4; //4 bytes size
      }
      //Voltage information
      else if (includes(volt_chns, channel_id) && channel_type === 0x74) {
        var voltage = "volt_" + (channel_id - volt_chns[0] +1);
        decoded[voltage] = readUInt16BE(bytes.slice(i, i + 2)) / volt_mult;
        i += 2; //2 bytes size
      }
    } //for loop bytes lenght
  } // fPort = 1
  //Scheduler uplink
  else if (port === 5) {
    if (bytes.length > 3) {
      decoded.scheduler_number = bytes[1];
      decoded.channel_id = bytes[2];
      decoded.control_byte = bytes[3];
      decoded.weekmask = bytes[5];
      decoded.start_time = (bytes[6] << 8) + bytes[7]; 
      decoded.minutes_to_open = (bytes[8] << 8) + bytes[9]; 
      decoded.flow_finish = (bytes[10] << 8) + bytes[11];
    }
  }


  return {data: decoded};
}

function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readUInt16BE (buf, offset) {
  offset = offset >>> 0;
  return (buf[offset] << 8) | buf[offset + 1];
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return value & 0xffffffff;
}

function readUInt32BE (buf, offset) {
  offset = offset >>> 0;

  return (buf[offset] * 0x1000000) +
    ((buf[offset + 1] << 16) |
    (buf[offset + 2] << 8) |
    buf[offset + 3]);
}

function readInt32LE(bytes) {
    var ref = readUInt32LE(bytes);
    return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}

function readFloat16LE(bytes) {
    var bits = (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 15 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 10) & 0x1f;
    var m = e === 0 ? (bits & 0x3ff) << 1 : (bits & 0x3ff) | 0x400;
    var f = sign * m * Math.pow(2, e - 25);
    return f;
}

function readFloatLE(bytes) {
    var bits = (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    var sign = bits >>> 31 === 0 ? 1.0 : -1.0;
    var e = (bits >>> 23) & 0xff;
    var m = e === 0 ? (bits & 0x7fffff) << 1 : (bits & 0x7fffff) | 0x800000;
    var f = sign * m * Math.pow(2, e - 150);
    return f;
}

function getBit(number, position) {
  // Use bitwise AND to isolate the specific bit
  const bitMask = 1 << position;
  return (number & bitMask) >> position;
}

function includes(datas, value) {
    var size = datas.length;
    for (var i = 0; i < size; i++) {
        if (datas[i] == value) {
            return true;
        }
    }
    return false;
}

 
  // Encode downlink function.
  //
  // Input is an object with the following fields:
  // - data = Object representing the payload that must be encoded.
  // - variables = Object containing the configured device variables.
  //
  // Output must be an object with the following fields:
  // - bytes = Byte array containing the downlink payload.
function encodeDownlink(input) {
  let port = input.fPort;
  let outbytes = [];
  if (port === 5) {
    //if has scheduler_read key....
    if (input.data.hasOwnProperty('read_scheduler')) {
        //read specified scheduler on key read_scheduler
        outbytes = [0x10, input.data.read_scheduler];
    } else if (input.data.hasOwnProperty('write_scheduler')) {
        //write specific scheduler on key scheduler_write and write all scheduler objects (0xCA)
        outbytes = [0x20, input.data.output, input.data.write_scheduler, 0xCA, input.data.control_byte, 0xFF, input.data.weekmask, input.data.start_timeHr, input.data.start_timeMin, input.data.end_timeHr, input.data.end_timeMin, input.data.flow_finishMSB, input.data.flow_finishLSB];
    } else if (input.data.hasOwnProperty('write_controlbyte')) {
      //write control byte on key write_controlbyte to specific output contained in data.output and specific scheduler contained on data.scheduler   
      outbytes = [0x20, input.data.output, input.data.scheduler, 0x01, input.data.write_controlbyte];
    } else if (input.data.hasOwnProperty('write_weekmask')) {
      //write weekmask byte on key write_weekmask to specific output contained in data.output and specific scheduler contained on data.scheduler   
      outbytes = [0x20, input.data.output, input.data.scheduler, 0x02, input.data.write_weekmask];
    } else if (input.data.hasOwnProperty('write_timer')) {
      //write timers on keys data.start_timeHr data.start_timeMin data.end_timeHr data.end_timeMin to specific output contained in data.output and specific scheduler contained on data.scheduler  
      outbytes = [0x20, input.data.output, input.data.scheduler, 0x03, input.data.start_timeHr, input.data.start_timeMin, input.data.end_timeHr, input.data.end_timeMin];
    } else if (input.data.hasOwnProperty('write_flow')) {
      //write flow to finish on keys data.flow_finishMSB data.flow_finishLSB to specific output contained in data.output and specific scheduler contained on data.scheduler  
      outbytes = [0x20, input.data.output, input.data.scheduler, 0x05, input.data.flow_finishMSB, input.data.flow_finishLSB];
    }
}
//Gem settings downlink command
else if (port === 6) {
    //Settings read command
    if (!input.data.hasOwnProperty('write_setting')) {
        outbytes = [0x10];
    }
    else {
        outbytes = [0x20, input.data.write_setting, input.data.setting_value]
    }
}
//Gem valve actuator downlink command (legacy / manual mode)
else if (port === 10) {
    if (input.data.hasOwnProperty('mask')) {
        outbytes = [(input.data.mask >> 8) & 0xFF, input.data.mask & 0xFF ]
    }
    else if (input.data.hasOwnProperty('channels')) {
        var bytearray = []
        for (var i = 0; i < input.data.channels.length; i++) {
            bytearray[Math.floor(i / 8)] |= (input.data.channels[i].status ? 1 : 0) << (i % 8);
        }
        outbytes = [bytearray[1], bytearray[0]];
    }
}


    return {
      bytes: outbytes
    };
  }
