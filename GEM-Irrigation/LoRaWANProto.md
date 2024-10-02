# LoRaWAN Protocol

GEM Modules uses LoRaWAN protocol, at the moment the CPU from RAK uses LoRaWAN® Specification v1.0.3. With this specification we have one significant feature: DeviceTimeReq in order to synchronize the internal clock.
LoRaWAN uses ports from 1 to 255 with a few ports reserved on this range, and we use them to differenciate between commands.
> [!NOTE]
> It's important to note, that the module must send **first** an uplink to the server, in order to get possible pending downlinks, this applies also for MAC commands (Ex. DeviceTimeReq)

# GEM Uplink Ports
## Port 1 - General module information (Heartbeat)
In port 1 we report the current module status
- [x] Outputs status (2 bytes)
- [x] Voltage (if applicable)
- [x] Analog Inputs (if applicable)

## Port X - Reply to command
Each downlink to the module, have their response on *the same port* as the downlink command. 
Read commands (0x10) will have a response defined on this manual with the requested payload (scheduler, config, etc)
Write commands (0x20), the module will reply with a message of 3 bytes length with the following format:
| Byte 0 | Byte 1              | Byte 2                        |
|:------:|---------------------|-------------------------------|
| 0x20   | Requested Command   | Command Status                |

### Command Status Byte
The command status byte reflects if the request is done correctly or there's an error
| Command Status Byte | Meaning        |
|:------:|-----------------------|
| 0x00  | State OK               |
| 0xFF  | Write Error            |
| 0xFA  | Wrong Output Requested |
| 0xFB  | Bad Parameter Size     |
| 0xFC  | Bad Parameter Value(s) |



> [!IMPORTANT]
> More detail about this feature will go here later, as this feature is subject to change

# GEM Downlink Ports
## Port 0 - MAC Commands
Used for receiving MAC commands (Media Access Commands). This port is automatically handled by the LoRaWAN stack internal to the module. But there's one exception as we're using this port downlink to synchronize the internal RTC.

## Port 5 - Scheduler command
This port is used to handle the reading and writing of GEM internal schedulers, the first byte defines if used command is to read or to write scheduler

### Scheduler read command (0x10)
#### Command to send
| Byte 0 | Byte 1              | Byte 2                        |
|:------:|---------------------|-------------------------------|
| 0x10   | Output from 0 to 10 | Schedule Number from 0 to MAX |

#### Returned info
Returns entire scheduler for specified channel on Byte 1.
| Byte 0 | Byte 1          | Byte 2          | Byte 3       | Byte 4   | Byte 5   | Byte n   |
|:------:|-----------------|-----------------|--------------|----------|----------|----------|
| 0xCA   | Output Number   | Schedule Number | Control Byte | 0xFF     | WeekMask |  ---     |


### Scheduler write command (0x20)
Writes a scheduler for specified channel on Byte 1. On Byte 2 we must send an hex value to make the module know which scheduler data needs update. Bytes 3 onwards are the data to send, if the data to send is equal to 1 byte, we'll put that byte on Byte 3 field (see Write Mode table)

#### Command to send
| Byte 0 | Byte 1              | Byte 2          | Byte 3     | Byte 4+       |
|:------:|---------------------|-----------------|------------|---------------|
| 0x20   | Output from 0 to 10 | Schedule Number | Write Mode | Data To write |

#### Write Mode (Byte 3)
| Write Mode   | Size required   | Description                            |
|:------------:|:---------------:|----------------------------------------|
| 0xCA         |  9 bytes        | Entire scheduler object                |
| 0x01         |  1 byte         | Modify Control Byte                    |
| 0x02         |  1 byte         | Modify WeekDays Byte                   |
| 0x03         |  2 bytes        | Schedule Start time and end time       |
| 0x04         |  2 bytes        | Minutes to open / end time             |
| 0x05         |  2 bytes        | End flow finish                        |
| 0xA1         |  2 bytes        | TBD                                    |
| 0xA2         |  2 bytes        | TBD                                    |

#### Returned info
Reply status packet


## Port 6 - Settings command
This port is used to handle the reading and writing of GEM internal settings, the first byte defines if used command is to read or to write settings.

> [!IMPORTANT]
> The settings command needs to be updated later to reflect the latest firmware changes, as the protocol improved with more commands and settings.
### Settings read command (0x10)
Returns entire settings contents on flash.
#### Command to send
| Byte 0 |
|:------:|
| 0x10   | 

#### Returned info
Returns entire settings byte.
| Byte 0           | Byte 1         | Byte N         | 
|:----------------:|----------------|----------------|
| Setting byte 0   | Setting byte 1 | Setting byte N | 

### Settings write command (0x20)
Writes specific setting byte (on byte 1) with values from byte 2 onwards.
#### Command to send
| Byte 0 | Byte 1             | Byte 2           | Byte N           |
|:------:|:------------------:|:----------------:|:----------------:|
| 0x20   | Setting to write   | Setting byte 1   | Setting byte N   | 

#### Setting to write (Byte 1)
| Setting to write | Size required   | Description                  |
|:----------------:|:---------------:|------------------------------|
| 0x01             |  1 byte         | HeartBeat Interval (minutes) |
| 0x02             |  1 byte         | Sensors Interval (minutes)   |
| 0x03             |  1 byte         | Sensors Interval config byte |
| 0x04             |  1 byte         | Timezone setting             |
| 0x05             |  1 byte         | TBD                          |
| 0x06             |  1 byte         | TBD                          |
| 0x07             |  1 byte         | TBD                          |
| 0x08             |  1 byte         | TBD                          |

#### Sensors interval config byte
Specifies which values to attach to sensors timer packet, if Bit=1 attach this sensor, else don't attach.
| Bit | Description                              |
|:---:|:----------------------------------------:|
| 0   | Send Analog channel 1 information        |
| 1   | Send Analog channel 2 information        |
| 2   | Send Digital channel 1 information       |
| 3   | Send Digital channel 2 information       |
| 4   | Send Module related info (battery, SoC)  |
| 5   | Reserved                                 |
| 6   | Reserved                                 |
| 7   | Reserved                                 |


## Port 10 - Open/Close command
This port is for legacy purposes, as the previous GEM version used this port for downlinks. Commands here, will open or close a valve inconditionally, no matter if there is a scheduler working.
| Byte 0               | Byte 1                  |
|:--------------------:|-------------------------|
| Ourput 0 to 10 MSB   | Output from 0 to 10 LSB |
