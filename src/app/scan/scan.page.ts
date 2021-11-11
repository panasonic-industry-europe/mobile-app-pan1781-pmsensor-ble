/* 

 * Copyright 2021 Panasonic Industrial Devices Europe GmbH

 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import { Component, OnInit, NgZone } from '@angular/core';
import { DataService } from '../services/data.service';
import { Router } from '@angular/router';
import { BluetoothDevice, BluetoothService } from 'src/app/services/bluetooth.service';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit {

  scanning = false;             // Bool used to toggle scan button text
  BLEDevices: [] = [];          // Array which stores the found BLE devices

  constructor(
    public dataService: DataService,
    private router: Router,
    private bluetoothService: BluetoothService,
    private zone: NgZone,
    private platform: Platform
  ) { }

  // Initialize function for component
  async ngOnInit() {}

  // Called every time when the cable replace demo screen is entered
  ionViewWillEnter() {
    try {
      this.platform.ready().then((plt) => {
        this.zone.run(async () => {
          let platformName = this.platform.is('android') ? 'android' : 'ios';

          // Disconnect device if one is connected
          if (this.dataService.selectedDevice) {
            this.bluetoothService.disconnect(this.dataService.selectedDevice)
          }
          // Start scan if Bluetooth is ready
          if (platformName === 'android') {
            if (this.bluetoothService.bleInitResult && this.bluetoothService.bleInitResult.status === 'enabled') {
              this.scan();
            } else {
              console.error('bluetooth not enabled');
            }
          } else if (platformName === 'ios') {
            if (this.bluetoothService.bleInitResult) {
              this.scan();
            } else {
              console.error('bluetooth not enabled');
            }
          }
        })
      })
    } catch (error) {
      console.error('BLE init error: ', error);
    }
  }

  // Scan function
  async scan() {
    this.platform.ready().then(() => {
      // Change scan button text
      this.scanning = true;
      // Start scan
      this.bluetoothService.startScanning([]).subscribe(result => {
        this.zone.run(async () => {
          // Store id as address
          result.address = result.id;
          console.log('Scanresult: ', JSON.stringify(result));
          // Store new BLE device if it is not already in the array. Also only devices wich have names are stored.
          if (!this.dataService.scannedBluetoothDevices.find(dev => dev.address === result.address) && result.name !== null && result.name !== undefined) {
            result.status = 'Not Connected';
            this.dataService.scannedBluetoothDevices.push(result);
          }
        });
      },
        err => {
          console.error('connect via BLE error: ', err);
        }
      );

      // Stop scan after 5 seconds
      setTimeout(() => {
        console.log('Found Devices: ', this.BLEDevices);
        this.scanning = false;
      }, 5000);
    });
  }

  // Connect function
  async connect(device: BluetoothDevice) {
    // Start connection process to BLE device
    this.bluetoothService.connect(device);
    let connected = await this.waitForConnection(device, 5);
    // Connection should be finished within 5 seconds
    if (connected == true) {
      // If connection is established within 5 seconds, open cable replace demo page
      this.router.navigate(["CR-Demo"]);
    } else {
      console.log("Connection error");
    }
  }

  // Disconnect function
  disconnect(device: BluetoothDevice) {
    this.bluetoothService.disconnect(device);
  }

  // Checks if device connection is successfully done within a given time in seconds.
  waitForConnection = async (device: BluetoothDevice, timeout: number): Promise<boolean> => {
    return new Promise(async (resolve, reject) => {
      for (let i = 0; i < timeout; i++) {
        if (device.connected == true) {
          resolve(true);
        }
        await this.delay(1000);
      }
      resolve(false);
    });
  }

  // Promise based delay function
  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
