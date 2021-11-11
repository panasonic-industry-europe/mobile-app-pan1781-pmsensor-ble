/* 

 * Copyright 2021 Panasonic Industrial Devices Europe GmbH

 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { DataService } from './services/data.service';
import { BluetoothService } from './services/bluetooth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {

  keyboardHeight = 0;

  constructor(
    private platform: Platform,
    private statusBar: StatusBar,
    private screenOrientation: ScreenOrientation,
    private dataService: DataService,
    private bluetooth: BluetoothService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then( async () => {
      this.dataService.platform = this.platform.is('android') ? 'android' : 'ios';
      this.statusBar.hide();
      (window as any).navigationbar.setUp(true);
      this.screenOrientation.lock('portrait');

      await this.bluetooth.initBluetooth();
    });
    this.platform.ready().then( plt => {
      if (this.platform.is('android') )
      {
        // window.addEventListener('native.keyboardshow', (e) => {
        //   console.log("Show Event on App level");
        //   const event: any = e;
        //   this.keyboardHeight = event.keyboardHeight + 30;
        // });
        // window.addEventListener('native.keyboardhide', (e) => {
        //   console.log("Hide Event on App level");
        //   const event: any = e;
        //   this.keyboardHeight = 0;
        // });
      }
    });
  }
}
