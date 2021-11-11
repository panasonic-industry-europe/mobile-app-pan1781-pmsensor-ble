/* 

 * Copyright 2021 Panasonic Industrial Devices Europe GmbH

 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/


import { Injectable, NgZone } from '@angular/core';
import { BluetoothLE, BluetoothLEOriginal, InitParams } from '@ionic-native/bluetooth-le';
import { Platform } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { BLE } from '@ionic-native/ble/ngx';
import { DataService } from './data.service';

// Bluetooth device interface
export interface BluetoothDevice {
  name: string,
  address: string,
  advertising: string,
  status: string,
  connected: boolean,
  wasConnected: boolean,
  connection: Subscription,
  services: string[],
  params: DeviceParameter
}

// Standard device parameters interface
export interface DeviceParameter {
  service: string,
  characteristic_TX: string,
  characteristic_RX: string
}

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  bluetooth: BluetoothLEOriginal = BluetoothLE;           // Bluetooth Service (Is used together with BLE service. Both have Pros and Cons)
  public bleInitResult: any;                              // Stores information about Bluetooth periphery initialization result
  peripheral: Observable<any> = null;                     // Reference to Bluetooth periphery
  mtu = 247;                                              // MTU size (Not valid for IOS. For IOS mtu will be negotiated automatically)

  params1762: DeviceParameter = {                         // PAN1762 service and characteristic parameter
    service: 'E079C6A0-AA8B-11E3-A903-0002A5D5C51B',
    characteristic_TX: 'B38312C0-AA89-11E3-9CEF-0002A5D5C51B',
    characteristic_RX: 'B38312C0-AA89-11E3-9CEF-0002A5D5C51B'
  };
  params1780: DeviceParameter = {                         // PAN1780 service and characteristic parameter
    service: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
    characteristic_TX: '6E400002-B5A3-F393-E0A9-E50E24DCCA9E',
    characteristic_RX: '6E400003-B5A3-F393-E0A9-E50E24DCCA9E'
  };

  constructor(
    private plt: Platform,
    private ble: BLE,
    private zone: NgZone,
    private dataService: DataService
  ) { }

  // Initialize Bluetooth
  initBluetooth(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.plt.ready().then(async (readySource) => {
        if (readySource === 'cordova') {

          // Init Parameter
          console.log('Initializing Bluetooth');
          const params: InitParams = {
            request: true,
            statusReceiver: false,
            restoreKey: 'bluetoothleplugin'
          };

          // Initialization has to be handled different for Android and IOS
          const platForm = this.plt.is('android') ? 'android' : 'ios';
          if (platForm === 'android') {
            this.bluetooth.initialize(params).subscribe(
              async (result) => {
                console.log('Bluetooth init result: ', result);
                await this.delay(200);
                this.initializePeripheral();
                await this.delay(200);
                this.bleInitResult = result;
                resolve(result);
              },
              err => {
                console.error('Bluetooth init error ', err);
                reject(err);
              }
            );
          } else if (platForm === 'ios') {
            this.bluetooth.initialize(params);
            await this.delay(200);
            this.initializePeripheral();
            await this.delay(200);
            this.bleInitResult = {
              status: 'enabled'
            }
          }
        }
      });
    });
  }

  // Initialize Bluetooth Peripheral
  public async initializePeripheral() {
    try {
      // Save peripheral object
      this.peripheral = this.bluetooth.initializePeripheral({
        request: true,
        restoreKey: 'bluetoothleplugin'
      });
      await this.delay(200);
      console.log('initialized peripheral: ', this.peripheral);
      // Main Bluetooth status subscriber (Not needed for function but interesting to see for debugging).
      this.peripheral.subscribe(message => {
        console.log('MAIN PERIPHERAL SUBSCRIBER', message);
      });
    } catch (error) {
      console.error("Error in initializePeripheral: ", error);
    }
  }

  // Start scan function
  startScanning(services) {
    console.log('Scanning for devices with services: ', services);
    // Scans for 5 seconds
    return this.ble.scan(services, 5);
  }

  // Stop scan function after delay in seconds
  stopScanning(delay) {
    setTimeout(() => {
      this.bluetooth.stopScan().then((result) => {
        console.log('scan stopped', result);
      },
        err => {
          console.error(err);
        });
    }, delay);
  }

  // Connect to BLE device function
  connect(bluetoothDevice: BluetoothDevice) {
    // Change device status (Used for scanned devices list)
    bluetoothDevice.status = 'connecting...';
    // Connect
    bluetoothDevice.connection = this.ble.connect(bluetoothDevice.address).subscribe(connected => {
      this.zone.run( async () => {
        console.log('device connected BLE: ', JSON.stringify(connected, null, 4));
        bluetoothDevice.wasConnected = true;
        bluetoothDevice.connected = true;
        bluetoothDevice.status = 'Connected';
        bluetoothDevice.services = connected.services;
        // Find out which device is connected
        if( bluetoothDevice.services.findIndex(service => service.toLowerCase() === this.params1762.service.toLowerCase()) != -1 ) {
          console.log("Found PAN1762");
          // Make a copy of the params with spread operator
          bluetoothDevice.params = {...this.params1762};
        } else if ( bluetoothDevice.services.findIndex(service => service.toLowerCase() === this.params1780.service.toLowerCase()) != -1 ) {
          console.log("Found PAN1780");
          // Make a copy of the params with spread operator
          bluetoothDevice.params = {...this.params1780};
        }
        // Save connected device
        this.dataService.selectedDevice = bluetoothDevice;

        // Request MTU (On IOS the MTU is automatically set to available maximum.)
        const plt = this.plt.is('android') ? 'android' : 'ios';
        if(plt === 'android')
        {
          console.log("Address: ", bluetoothDevice.address);
          console.log("MTU: ", this.mtu);
          const mtuResult = await this.ble.requestMtu(bluetoothDevice.address, this.mtu);
          console.log('MTU Result: ', mtuResult);
        }
      });
    }, disconnected => {
      // Reconnect when device lost connection
      console.log('device disconnected: ', disconnected);
      this.zone.run(() => {
        bluetoothDevice.connected = false;
        this.connect( bluetoothDevice );
      });
    });
  }

  // Disconnect current connected BLE device
  async disconnect(bluetoothDevice: BluetoothDevice) {
    await this.ble.disconnect(bluetoothDevice.address);
    bluetoothDevice.wasConnected = true;
    bluetoothDevice.connected = false;
    bluetoothDevice.status = 'Not Connected';
    this.dataService.selectedDevice = undefined;
  }

  // Subscriber function (Can be used to be informed about value change of specific characteristic)
  startNotification() {
    console.log("this.dataService.selectedDevice: ", this.dataService.selectedDevice);
    return this.ble.startNotification(this.dataService.selectedDevice.address, this.dataService.selectedDevice.params.service, this.dataService.selectedDevice.params.characteristic_RX);
  }

  // Send data over BLE
  public async write( data: ArrayBuffer ) {
    // Input is (address, service, characteristic, data)
    return await this.ble.write(this.dataService.selectedDevice.address, this.dataService.selectedDevice.params.service, this.dataService.selectedDevice.params.characteristic_TX, data);
  }

  // Promise based delay function
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
