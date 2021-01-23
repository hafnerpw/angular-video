import {Component, OnInit} from '@angular/core';
import {AgoraClient, ClientEvent, NgxAgoraService, Stream, StreamEvent} from 'ngx-agora';
import {environment} from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  title = 'angular-video';
  remoteCalls: string[] = [];

  private client: AgoraClient;
  private localStream: Stream;
  private userId: number;
  localCallId = 'agora_local';

  ngOnInit(): void {
    this.client = this.ngxAgoraService.createClient({mode: 'rtc', codec: 'h264'});
    // this.client.init(environment.agora.appId); braucht man das ?
    this.localStream = this.ngxAgoraService.createStream({streamID: this.userId, audio: true, video: true, screen: false});
    this.assignLocalStreamHandlers();
    this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
  }

  constructor(private ngxAgoraService: NgxAgoraService) {
    this.userId = +(Math.random().toString(36) + '0000000000000000000').substr(2, 16);
  }

  private assignLocalStreamHandlers(): void {
    this.localStream.on(StreamEvent.MediaAccessAllowed, evt => {
        console.log('access allowed');
      }
    );

    this.localStream.on(StreamEvent.MediaAccessAllowed, evt => {
        console.log('access not allowed');
      }
    );
  }

  private initLocalStream(onSuccess?: () => any): void {
    this.localStream.init(
      () => {
        this.localStream.play(this.localCallId);
        if (onSuccess()) {
          onSuccess();
        }
      }, error => {
        console.error('getUserMedia failed', error);
      }
    );
  }

  private assignClientHandlers(): void {
    this.client.on(ClientEvent.LocalStreamPublished, evt => {
      console.log('local published');
    });

    this.client.on(ClientEvent.Error, evt => {
      console.warn('error', evt.reason);
      if (evt.reason === 'DYNAMIC_KEY_TIMEOUT') {
        this.client.renewChannelKey('', () => {
          console.log('Key renewed successfully');
        }, failure => {
          console.error('renewal failed', failure);
        });
      }
    });

    this.client.on(ClientEvent.RemoteStreamAdded, evt => {
      const stream = evt.stream as Stream;
      this.client.subscribe(stream, {audio: true, video: true}, error => {
        console.error('could not subscribe to remote stream', error);
      });
    });

    this.client.on(ClientEvent.RemoteStreamSubscribed, evt => {
      const stream = evt.stream as Stream;
      const id = this.getRemoteId(stream);
      if (!this.remoteCalls.length) {
        this.remoteCalls.push(id);
        setTimeout(() => stream.play(id), 1000);
      }
    });

    this.client.on(ClientEvent.RemoteStreamRemoved, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = [];
        console.log(`Remote stream is removed ${stream.getId()}`);
      }
    });

    this.client.on(ClientEvent.PeerLeave, evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call !== `${this.getRemoteId(stream)}`);
        console.log(`${evt.uid} left from this channel`);
      }
    });
  }

  join(onSuccess?: (uid: number | string) => void, onFailure?: (error: Error) => void): void {
    this.client.join(null, 'foo-bar', this.userId, onSuccess, onFailure);
  }

  publish(): void {
    this.client.publish(this.localStream, err => console.log('Publish local stream error: ' + err));
  }

  private getRemoteId(stream: Stream): string {
    return `agora_remote-${stream.getId()}`;
  }
}
