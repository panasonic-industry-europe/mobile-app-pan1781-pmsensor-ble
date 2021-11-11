/* 

 * Copyright 2021 Panasonic Industrial Devices Europe GmbH

 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { BluetoothService } from 'src/app/services/bluetooth.service';
import { Platform } from '@ionic/angular';




@Component({
  selector: 'app-cable-replacement',
  templateUrl: './cable-replacement.page.html',
  styleUrls: ['./cable-replacement.page.scss'],
})
export class CableReplacementPage implements OnInit, AfterViewInit {

  showSplash = true;                                // Bool with which demo splash screen can be triggered
  @ViewChild('scroll') private scroll: ElementRef;  // Reference to HTML scroll container in cable-replacement.page.html
  keyboardHeight = 0;                               // Stores current keyboard height

  inputMessage: string;                             // Stores current string of input field in cable-replacement.page.html
  messages: Array<any> = [];                        // Stores history of in and out going messages


  PM1_0: number = 24;
  PM2_5: number = 50;
  PM10: number = 240;

  constructor(
    private router: Router,
    private zone: NgZone,
    private bleService: BluetoothService,
    private platform: Platform
  ) { }

  // Initialize component. (called only once)
  async ngOnInit() {
    // Deactivate splash screen after 1500 msec
    setTimeout(async () => {
      this.showSplash = false;
    }, 1500);
    // Set moment to local time
    moment.locale('en');
    // Initialize event listener for shifting input and button above the keyboard area when keyboard appears
    this.initWindowListeners();
  }

  // Called every time when the cable replace demo screen is entered
  ionViewWillEnter() {
    // Clear message history
    this.clearMessageHistory();
    // Subscribe for incomming messages
    setTimeout(() => {
      this.bleService.startNotification().subscribe(
        (result: any) => {
          this.zone.run(() => {
            this.getMessage(result);
          });
        }
      );
    }, 500);
  }

  // Do not delete
  ngAfterViewInit() { }

  // Go to scan page event
  public goToScanPage() {
    this.router.navigate(['BT-Scan']);
  }

  // Send message event
  public async sendMessage() {
    // Store message from input field
    let message = this.inputMessage;
    try {
      // Add outgoing message to history
      this.addToMessageHistory(message, "out");

      // Send message
      message += '\r\n';
      const data = new TextEncoder().encode(message).buffer as ArrayBuffer;
      console.log('Writing CR-message ', message, data, data.byteLength);
      await this.bleService.write(data);

      // Scroll to last message
      this.scroll.nativeElement.scrollTop = this.scroll.nativeElement.scrollHeight;

      // Clear input field
      this.inputMessage = '';
    } catch (error) {
      console.error('send message error', error);
    }
  }

  private getMessage(message: any) {
    // decode received message
    console.log('incomming message: ', message);
    const msgString = new TextDecoder().decode(new Uint8Array(message[0]));
    console.log("msgString: ", msgString);

    let array: Array<string> = msgString.split(";");

    for (let arrayObj of array) {
      let keyValuePair = arrayObj.split(":");
      if (keyValuePair.length == 2) {
        switch (keyValuePair[0]) {
          case "PM1.0":
            this.PM1_0 = Number(keyValuePair[1]);
            break;
          case "PM2.5":
            this.PM2_5 = Number(keyValuePair[1]);
            break;
          case "PM10":
            this.PM10 = Number(keyValuePair[1]);
            break;
          default:
            break;
        }
      }

    }
  }

  // Function which handles the history array for in and out going messages
  private addToMessageHistory(message: string, direction: string) {
    console.log('Adding message: ', message);
    const messageObj = {
      direction: direction,
      message: message,
      time: moment(),
      timeText: ''
    };
    this.messages.push(messageObj);
    console.log("this.messages: ", this.messages);
  }

  // Function for clearing history
  private clearMessageHistory() {
    this.messages = [];
  }

  // Initialize event listener for shifting input and button above the keyboard area when keyboard appears
  private initWindowListeners = () => {
    window.addEventListener('native.keyboardshow', (e) => {
      this.zone.run(() => {
        const event: any = e;
        const plt: string = this.platform.is("android") ? 'android' : 'ios';
        let navbarheight = screen.height - this.platform.height();
        if (plt === 'android') {
          this.keyboardHeight = event.keyboardHeight + 30 + navbarheight;
        } else if (plt === 'ios') {
          this.keyboardHeight = event.keyboardHeight + navbarheight;
        }
        setTimeout(() => {
          this.scroll.nativeElement.scrollTop = this.scroll.nativeElement.scrollHeight;
        }, 10);
      });
    });
    window.addEventListener('native.keyboardhide', (e) => {
      this.zone.run(() => {
        const event: any = e;
        this.keyboardHeight = 0;
      });
    });
  }
}
