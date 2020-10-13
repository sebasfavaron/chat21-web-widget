import { ElementRef, Injectable } from '@angular/core';
import { Headers, Http } from '@angular/http';
import {DomSanitizer} from '@angular/platform-browser';

import {SecurityContext} from '@angular/core';
// import {NgDompurifySanitizer} from '@tinkoff/ng-dompurify';

// firebase
// import * as firebase from 'firebase/app';
// import 'firebase/database';


import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { environment } from '../../environments/environment';
import { DepartmentModel } from '../../models/department';
// models
import { MessageModel } from '../../models/message';
import { StarRatingWidgetService } from '../components/star-rating-widget/star-rating-widget.service';
// tslint:disable-next-line:max-line-length
import { IMG_PROFILE_BOT, IMG_PROFILE_DEFAULT, MSG_STATUS_SENT_SERVER, MSG_STATUS_RECEIVED, TYPE_MSG_TEXT, UID_SUPPORT_GROUP_MESSAGES, CHANNEL_TYPE_GROUP } from '../utils/constants';
// utils
import { getUrlImgProfile, getImageUrlThumb, searchIndexInArrayForUid, setHeaderDate, replaceBr, convertMessage } from '../utils/utils';
import { Globals } from '../utils/globals';
import { StorageService } from '../providers/storage.service';
import { AppConfigService } from '../providers/app-config.service';

@Injectable()
export class MessagingService {

  tenant: string;
  senderId: string;
  conversationWith: string;
  urlMessages: string;
  urlConversation: string;
  urlNodeFirebaseGroups: string;
  urlNodeFirebaseContact: string;
  urlNodeTypings: string;
  setTimeoutWritingMessages: NodeJS.Timer;

  messagesRef: any;
  messages: Array<MessageModel>;

  obsAdded: any;
  obsAddedMsg: any;

  obsTyping: any;
  // observableWidgetActive: any;

  firebaseMessagesKey: any;
  conversationRef: any;
  conversationsRef: any;                    /** ref nodo conversazioni: check if conversation is closed */
  // isWidgetActive: boolean;
  channel_type: string;
  API_URL: string;
  departments: DepartmentModel[];
  filterSystemMsg = true;

  getUrlImgProfile = getUrlImgProfile;
  convertMessage = convertMessage;

  constructor(
    // private el: ElementRef,
    public starRatingWidgetService: StarRatingWidgetService,
    public http: Http,
    public g: Globals,
    public storageService: StorageService,
    public appConfigService: AppConfigService,
    private sanitizer: DomSanitizer,
    // private readonly dompurifySanitizer: NgDompurifySanitizer
  ) {
    this.API_URL = appConfigService.getConfig().apiUrl;
    //  that.g.wdLog(['MessagingService::this.API_URL',  this.API_URL );
    if (!this.API_URL) {
      throw new Error('apiUrl is not defined');
    }
    this.obsAdded = new BehaviorSubject<MessageModel>(null);
    this.obsTyping = new BehaviorSubject<any>(null);
    // this.obsAddedMsg = new BehaviorSubject<string>(null);
    // this.observableWidgetActive = new BehaviorSubject<boolean>(this.isWidgetActive);
  }


  /**
   * da modificare e da spostare da qui!!!
   * chiamata da app component sull'init!!!
   */
  // public getMongDbDepartments(projectId): Observable<DepartmentModel[]> {
  //   const url = this.API_URL + projectId + '/departments/';
  //   this.g.wdLog(['***** getMongDbDepartments *****', url]);
  //   // const url = `http://api.chat21.org/app1/departments`;
  //   // tslint:disable-next-line:max-line-length
  // tslint:disable-next-line:max-line-length
  //   // const TOKEN = 'JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyIkX18iOnsic3RyaWN0TW9kZSI6dHJ1ZSwic2VsZWN0ZWQiOnsiZW1haWwiOjEsImZpcnN0bmFtZSI6MSwibGFzdG5hbWUiOjEsInBhc3N3b3JkIjoxLCJpZCI6MX0sImdldHRlcnMiOnt9LCJfaWQiOiI1YWFiYWRlODM5ZGI3ZDAwMTQ3N2QzZDUiLCJ3YXNQb3B1bGF0ZWQiOmZhbHNlLCJhY3RpdmVQYXRocyI6eyJwYXRocyI6eyJwYXNzd29yZCI6ImluaXQiLCJlbWFpbCI6ImluaXQiLCJsYXN0bmFtZSI6ImluaXQiLCJmaXJzdG5hbWUiOiJpbml0IiwiX2lkIjoiaW5pdCJ9LCJzdGF0ZXMiOnsiaWdub3JlIjp7fSwiZGVmYXVsdCI6e30sImluaXQiOnsibGFzdG5hbWUiOnRydWUsImZpcnN0bmFtZSI6dHJ1ZSwicGFzc3dvcmQiOnRydWUsImVtYWlsIjp0cnVlLCJfaWQiOnRydWV9LCJtb2RpZnkiOnt9LCJyZXF1aXJlIjp7fX0sInN0YXRlTmFtZXMiOlsicmVxdWlyZSIsIm1vZGlmeSIsImluaXQiLCJkZWZhdWx0IiwiaWdub3JlIl19LCJwYXRoc1RvU2NvcGVzIjp7fSwiZW1pdHRlciI6eyJkb21haW4iOm51bGwsIl9ldmVudHMiOnt9LCJfZXZlbnRzQ291bnQiOjAsIl9tYXhMaXN0ZW5lcnMiOjB9LCIkb3B0aW9ucyI6dHJ1ZX0sImlzTmV3IjpmYWxzZSwiX2RvYyI6eyJsYXN0bmFtZSI6IlNwb256aWVsbG8iLCJmaXJzdG5hbWUiOiJBbmRyZWEiLCJwYXNzd29yZCI6IiQyYSQxMCRkMHBTV3lTQkp5ejFQLmE0Y0QuamwubnpvbW9xMGlXZUlHRmZqRGNQZVhUeENpRUVJOTdNVyIsImVtYWlsIjoic3BvbnppZWxsb0BnbWFpbC5jb20iLCJfaWQiOiI1YWFiYWRlODM5ZGI3ZDAwMTQ3N2QzZDUifSwiJGluaXQiOnRydWUsImlhdCI6MTUyMTY1MjE3Mn0.-iBbE2gCDrcUF1uh9HdK1kVsIRyRCBi_Pvm7LJEKhbs';
  //   //  that.g.wdLog(['MONGO DB DEPARTMENTS URL', url, TOKEN);
  //   const headers = new Headers();
  //   headers.append('Content-Type', 'application/json');
  //   // headers.append('Authorization', TOKEN);
  //   return this.http
  //     .get(url, { headers })
  //     .map((response) => response.json());
  // }


  /**
   *
   */
  public initialize(userUid, tenant, channel_type) {
    this.g.wdLog(['***** initialize MessagingService *****']);
    this.messages = [];
    this.channel_type = channel_type;
    this.senderId = userUid;
    this.tenant = tenant;
    this.urlMessages = '/apps/' + this.tenant + '/users/' + this.senderId + '/messages/';
    this.urlConversation = '/apps/' + this.tenant + '/users/' + this.senderId + '/conversations/';
    this.urlNodeTypings = '/apps/' + this.tenant + '/typings/' + this.senderId;
  }

  /**
   * genero un uid univoco
   * da passare al servizio ogni volta che invio un msg
   */
  connect(conversationWith) {
    this.g.wdLog(['***** connect MessagingService *****']);
    this.checkRemoveConversation(conversationWith);
    this.checkMessages(conversationWith);
  }

  /**
   * subcribe to mesages node (on added and removed message)
   * and update array messages
   */
  checkMessages(conversationWith) {
    const urlMessages = this.urlMessages + conversationWith;
    // const firebaseMessages = firebase.database().ref(urlMessages);
    // this.messagesRef = firebaseMessages.orderByChild('timestamp').limitToLast(1000);
    this.subscriptionsToMessages();
  }


  /**
   * subscribe to:
   * child_removed, child_added, child_changed
   * valutare utilizzo di .map!!!!
   */
  subscriptionsToMessages() {
    const that = this;
    //// SUBSCRIBE REMOVED ////
    // this.messagesRef.on('child_removed', function (childSnapshot) {
    //   const index = searchIndexInArrayForUid(that.messages, childSnapshot.key);
    //   if (index > -1) {
    //     that.messages.splice(index, 1);
    //   }
    // });
    //// SUBSCRIBE ADDED ////
    // this.messagesRef.on('child_added', function (childSnapshot) {
    //   const message = childSnapshot.val();
    //   // console.log('1 passo -----', message);
    //   that.g.wdLog(['A: child_added *****', childSnapshot.key, JSON.stringify(message)]);
    //   const video_pattern = /^(tdvideo:.*)/mg;
    //   const key = 'tdvideo:';
    //   // const messageText = that.splitMessageForKey(key, video_pattern, message.text);
    //   // const messageText = message.text;
    //   let messageText = that.convertMessage(message.text);
    //   messageText = replaceBr(messageText); // message['text']);

    //   if (that.checkMessage(message)) {
    //     // imposto il giorno del messaggio
    //     // const timestamp =  firebase.database.ServerValue.TIMESTAMP;
    //     const dateSendingMessage = setHeaderDate(message['timestamp']);
    //     // SPONZIELLO PATCH // forces update of userFullname from remote command
    //     // console.log("Sponziello patch")
    //     // console.log("saved_conversations_attributes_STRING: " , saved_conversations_attributes_STRING)

    //     const saved_conversations_attributes_STRING = that.storageService.getItem('attributes');
    //     let saved_conversations_attributes = {};
    //     if (saved_conversations_attributes_STRING != null) {
    //       saved_conversations_attributes = JSON.parse(saved_conversations_attributes_STRING);
    //     }
    //     // console.log("saved_conversations_attributes: " , saved_conversations_attributes)
    //     if (message['attributes'] && message['attributes']['updateUserFullname']) {
    //       // console.log("message->updateUserFullname! " , message['attributes']['updateUserFullname'])
    //       const userFullname = message['attributes']['updateUserFullname'];
    //       saved_conversations_attributes['userFullname'] = userFullname;
    //       // console.log("new saved_conversations_attributes: " , saved_conversations_attributes)
    //       that.g.userFullname = userFullname;
    //       that.storageService.setItem('attributes', JSON.stringify(saved_conversations_attributes));
    //     }
    //     if (message['attributes'] && message['attributes']['updateUserEmail']) {
    //       const userEmail = message['attributes']['updateUserEmail'];
    //       saved_conversations_attributes['userEmail'] = userEmail;
    //       that.g.userEmail = userEmail;
    //       that.storageService.setItem('attributes', JSON.stringify(saved_conversations_attributes));
    //     }

    //     // TEST BUTTONS
    //     // message['attributes'] = {
    //     //   attachment: {
    //     //     type: 'template',
    //     //     buttons: [
    //     //         {
    //     //             type: 'action',
    //     //             value: 'EXECUTE AN ACTION',
    //     //             action: 'my-action-name',
    //     //             show_reply: true
    //     //         },
    //     //         {
    //     //           type: "url",
    //     //           value: "SITE 2",
    //     //           link: "http://www.ietf.org",
    //     //           target: "external"
    //     //         },
    //     //         {
    //     //           type: "url",
    //     //           value: "SITE 1",
    //     //           link: "http://www.tiledesk.com",
    //     //           target: "self"
    //     //         },
    //     //         {
    //     //           type: "text",
    //     //           value: "REPLY ONE"
    //     //         },
    //     //         {
    //     //             type: "text",
    //     //             value: "REPLY TWO"
    //     //         }
    //     //     ]
    //     //   }
    //     // };

    //     // end SPONZIELLO PATCH
    //     const msg = new MessageModel(
    //       childSnapshot.key,
    //       // message['language'],
    //       message['recipient'],
    //       message['recipient_fullname'],
    //       message['sender'],
    //       message['sender_fullname'],
    //       message['status'],
    //       message['metadata'],
    //       messageText,
    //       // message['timestamp'],
    //       // dateSendingMessage,
    //       message['type'],
    //       message['attributes'],
    //       message['channel_type'],
    //       message['progectId']
    //     );
    //     // msg.sender_urlImage = that.getUrlImgProfile(message['sender']);
    //     that.triggerGetImageUrlThumb(msg);
    //     if (that.messages.indexOf(message) === -1) {
    //       that.addMessage(msg);
    //     }
    //   }
    // });

    const childSnapshotKey = '000000';
    const message = {
      "text": "messageText",
      "timestamp": "2020-10-02",
      "attributes": {
        "updateUserFullname": "TestFullName",
        "updateUserEmail": "testEmail@gmail.com",
      },
      "recipient": '12345', //uid
      "recipient_fullname": 'TestRecipientFullName',
      "sender": '12346',
      "sender_fullname": 'TestSenderFullName',
      "status": '200',
      "metadata": '',
      "type": "text",
      "channel_type": this.g.channelType,
      "progectId": this.g.projectid,
      
      "sender_urlImage": '',
      "uid": '12345',
      "projectid": this.g.projectid,
      "asFirebaseMessage": new function(){},
    }; // connectar a un json del server (no se si puedo porque asFirebaseMessage pide un Object)
    // console.log('1 passo -----', message);
    const video_pattern = /^(tdvideo:.*)/mg;
    const key = 'tdvideo:';
    // const messageText = that.splitMessageForKey(key, video_pattern, message.text);
    // const messageText = message.text;
    let messageText = that.convertMessage(message.text);
    messageText = replaceBr(messageText); // message['text']);

    if (true || that.checkMessage(message)) {
      // imposto il giorno del messaggio
      // const timestamp =  firebase.database.ServerValue.TIMESTAMP;
      const dateSendingMessage = setHeaderDate(message['timestamp']);
      // SPONZIELLO PATCH // forces update of userFullname from remote command
      // console.log("Sponziello patch")
      // console.log("saved_conversations_attributes_STRING: " , saved_conversations_attributes_STRING)

      const saved_conversations_attributes_STRING = that.storageService.getItem('attributes');
      let saved_conversations_attributes = {};
      if (saved_conversations_attributes_STRING != null) {
        saved_conversations_attributes = JSON.parse(saved_conversations_attributes_STRING);
      }
      // console.log("saved_conversations_attributes: " , saved_conversations_attributes)
      if (message['attributes'] && message['attributes']['updateUserFullname']) {
        // console.log("message->updateUserFullname! " , message['attributes']['updateUserFullname'])
        const userFullname = message['attributes']['updateUserFullname'];
        saved_conversations_attributes['userFullname'] = userFullname;
        // console.log("new saved_conversations_attributes: " , saved_conversations_attributes)
        that.g.userFullname = userFullname;
        that.storageService.setItem('attributes', JSON.stringify(saved_conversations_attributes));
      }
      if (message['attributes'] && message['attributes']['updateUserEmail']) {
        const userEmail = message['attributes']['updateUserEmail'];
        saved_conversations_attributes['userEmail'] = userEmail;
        that.g.userEmail = userEmail;
        that.storageService.setItem('attributes', JSON.stringify(saved_conversations_attributes));
      }

      // TEST BUTTONS
      // message['attributes'] = {
      //   attachment: {
      //     type: 'template',
      //     buttons: [
      //         {
      //             type: 'action',
      //             value: 'EXECUTE AN ACTION',
      //             action: 'my-action-name',
      //             show_reply: true
      //         },
      //         {
      //           type: "url",
      //           value: "SITE 2",
      //           link: "http://www.ietf.org",
      //           target: "external"
      //         },
      //         {
      //           type: "url",
      //           value: "SITE 1",
      //           link: "http://www.tiledesk.com",
      //           target: "self"
      //         },
      //         {
      //           type: "text",
      //           value: "REPLY ONE"
      //         },
      //         {
      //             type: "text",
      //             value: "REPLY TWO"
      //         }
      //     ]
      //   }
      // };

      // end SPONZIELLO PATCH
      const msg = new MessageModel(
        childSnapshotKey,
        // message['language'],
        message['recipient'],
        message['recipient_fullname'],
        message['sender'],
        message['sender_fullname'],
        message['status'],
        message['metadata'],
        messageText,
        // message['timestamp'],
        // dateSendingMessage,
        message['type'],
        message['attributes'],
        message['channel_type'],
        message['progectId']
      );
      // msg.sender_urlImage = that.getUrlImgProfile(message['sender']);
      that.triggerGetImageUrlThumb(msg);
      if (that.messages.indexOf(message) === -1) {
        that.addMessage(msg);
        that.addMessage(msg);
        that.addMessage(msg);
        that.addMessage(msg);
      }
    }
  }

  /**
   * recupero url immagine profilo
   * @param uid
   */
  // getUrlImgProfile(uid: string): string {
  //   const baseLocation = this.g.baseLocation;
  //   if (!uid || uid === 'system' ) {
  //     return baseLocation + IMG_PROFILE_BOT;
  //   } else if ( uid === 'error') {
  //     return baseLocation + IMG_PROFILE_DEFAULT;
  //   } else {
  //     return uid; //getImageUrlThumb(uid);
  //   }
  // }


  private addMessage(message) {
    if (message && message.sender === this.senderId) {
      const index = searchIndexInArrayForUid(this.messages, message.key);
      if (index < 0) {
        this.g.wdLog(['--------> ADD MSG IMG', index, message]);
        message.status = MSG_STATUS_SENT_SERVER.toString();
        this.messages.push(message);
      }
    } else {
      message.status = MSG_STATUS_SENT_SERVER.toString();
      this.g.wdLog(['--------> ADD MSG', message.status]);
      // console.log('--------> MSG ESISTE: ', this.messages.indexOf(message));
      this.messages.push(message);
      // this.triggerOnNewMessageReceived(message);
    }

    this.messages.sort(this.compareValues('timestamp', 'asc'));
    this.triggerOnMessageCreated(message);
    this.obsAdded.next(message);

    // try {
    //   this.storageService.setItem('messages', JSON.stringify(this.messages));
    // } catch (error) {
    //   this.g.wdLog(['> Error :' + error]);
    // }
  }


  splitMessageForKey(key, pattern, message) {
    // const split_pattern = /^(tdvideo:.*)/mg;
    const parts = message.split(pattern);
    const commands: any = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (i % 2 !== 0) {
        // console.log('part ::: ', part);
        const urlVideo = part.replace(key, '').trim();
        const command = {};
        command['type'] = 'video';
        command['url'] = urlVideo;
        commands.push(command);
        message = message.replace(part, '').trim();
      }
    }
    if (commands.length === 0) {
      return message;
    }
    if (message !== '') {
      message = '<div style="padding: 14px 0 10px 0;">' + message + '</div>';
    }
    let videoTags = '';
    for (let i = 0; i < commands.length; i++) {
      let urlVideo = commands[i]['url'];
      let videoTag = '';
      const keyYoutube = 'https://youtu.be/';
      const keyVimeo = 'https://vimeo.com/';
      // console.log('urlVideo:: ', urlVideo);
      if (urlVideo.includes(keyYoutube)) {
        urlVideo = urlVideo.replace(keyYoutube, 'https://youtube.com/embed/').trim();
        // console.log('YOUTUBE:: ', urlVideo);
      } else if (urlVideo.includes(keyVimeo)) {
        urlVideo = urlVideo.replace(keyVimeo, 'https://player.vimeo.com/video/').trim();
        // console.log('VIMEO:: ', urlVideo);
      } else {
        videoTag += '<video width="100%" height="210" controls="controls" style="color:green;">';
        videoTag += '<source src="' + urlVideo + '" type="video/mp4">';
        videoTag += '<source src="' + urlVideo + '" type="video/ogg">';
        videoTag += '<source src="' + urlVideo + '" type="video/webm">';
        videoTag += 'Your browser does not support the video tag.';
        videoTag += '</video>';
      }

      // let videoTag = '<object data="https://player.vimeo.com/video/88081351"';
      // // let videoTag = '<object data="https://youtube.com/embed/HXOHEKye0nE"';
      // videoTag += 'width="100%" style="max-width:100%; max-height:200px;">';
      // videoTag += '</object>';

      videoTag += '<iframe class="video" src="' + urlVideo + '"';
      videoTag += 'style="width:100%; height: auto;"';
      videoTag += 'frameborder="0" allow="autoplay; fullscreen" allowfullscreen>';
      videoTag += '</iframe>';

      // let videoTag = '<div style="max-width:100%; max-height:200px; float:none; clear:both; margin: 0px auto;">';
      // videoTag += '<embed type="video" src="' + urlVideo + '" width="100%" title="">';
      // videoTag += '</div>';
      videoTags = videoTags.concat(videoTag);
    }
    message = message.concat(videoTags);
    message = this.sanitizer.bypassSecurityTrustHtml(message);
    // console.log('message ::: ', message);
    return message;
  }

  /**
   *
   */
  checkMessage(message): boolean {
    if (message.text.trim() === '' && message.type === TYPE_MSG_TEXT) {
      // se è un messaggio vuoto non fare nulla
      // return false;
    }
    if (this.filterSystemMsg && message.attributes && message.attributes['subtype'] === 'info') {
      // se è un msg inviato da system NON fare nulla
      return false;
    } else if (message && message.sender === this.senderId && message.type !== TYPE_MSG_TEXT) {
      // se è un'immagine che ho inviato io NON fare nulla
      // aggiorno la stato del messaggio e la data
      // this.updateMessage(message);
      return true;
    }
    return true;
  }

  /**
   * function for dynamic sorting
   */
  private compareValues(key, order = 'asc') {
    return function (a, b) {
      if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
        // property doesn't exist on either object
        return 0;
      }
      const varA = (typeof a[key] === 'string') ? a[key].toUpperCase() : a[key];
      const varB = (typeof b[key] === 'string') ? b[key].toUpperCase() : b[key];

      let comparison = 0;
      if (varA > varB) {
        comparison = 1;
      } else if (varA < varB) {
        comparison = -1;
      }
      return (
        (order === 'desc') ? (comparison * -1) : comparison
      );
    };
  }


  /**
   * ?????????????????????????????????
   * ?????????????????????????????????
   * aggiorno lo stato del messaggio
   * questo stato indica che è stato consegnato al client e NON che è stato letto
   * se il messaggio NON è stato inviato da loggedUser AGGIORNO stato a 200
   * @param item
   * @param conversationWith
  */
 private setStatusMessage(item, conversationWith) {
  if (item.val()['status'] < MSG_STATUS_RECEIVED) {
    const msg = item.val();
    if (msg.sender !== this.senderId && msg.status < MSG_STATUS_RECEIVED) {
      // tslint:disable-next-line:max-line-length
      const urlNodeMessagesUpdate = '/apps/' + this.tenant + '/users/' + this.senderId + '/messages/' + conversationWith + '/' + item.key;
      this.g.wdLog(['AGGIORNO STATO MESSAGGIO', urlNodeMessagesUpdate]);
      // firebase.database().ref(urlNodeMessagesUpdate).update({ status: MSG_STATUS_RECEIVED });
    }
  }
}

  /**
   * check if agent writing
   */
  public checkWritingMessages(tenant, conversationWith): any {
    this.conversationWith = conversationWith;
    const urlNodeFirebase = '/apps/' + tenant + '/typings/' + conversationWith;
    this.g.wdLog(['checkWritingMessages *****', urlNodeFirebase]);
    // const firebaseMessages = firebase.database().ref(urlNodeFirebase);
    // const messagesRef = firebaseMessages.orderByChild('timestamp').limitToLast(1);
    // return messagesRef;
  }

  /**
   * NON USATA
   * ?????????????????????????????????
   * ?????????????????????????????????
   * verifico se sta rispondendo un bot, func chiamata da checkWritingMessages
   */
  checkIsBot(snapshot) {
    this.g.wdLog(['snapshot.numChildren() *****', snapshot.numChildren()]);
    const that = this;
    let RESP = null;
    if (snapshot.numChildren() === 0) {
      return '';
    }
    snapshot.forEach(
      function (childSnapshot) {
        const uid = childSnapshot.key;
         that.g.wdLog(['childSnapshot *****', uid]);
        if (uid.startsWith('bot_')) {
          RESP = uid;
          return;
        }
      }
    );
     that.g.wdLog(['RESP:', RESP]);
    return RESP;
  }


  sendMessage(
    senderFullname,
    msg,
    type,
    metadata,
    conversationWith,
    recipientFullname,
    attributes,
    projectid,
    channel_type) {
    return this.sendMessageFull(
      this.tenant,
      this.senderId,
      senderFullname,
      msg, type,
      metadata,
      conversationWith,
      recipientFullname,
      attributes,
      projectid,
      channel_type
    );
  }

  /**
   *
   */
  sendMessageFull(
    tenant,
    senderId,
    senderFullname,
    msg,
    type,
    metadata,
    conversationWith,
    recipientFullname,
    attributes,
    projectid,
    channel_type) {
    this.g.wdLog(['>>> SEND MESSAGE: ']);
    // console.log('tenant: ', tenant);
    // console.log('senderId: ', senderId);
    // console.log('senderFullname: ', senderFullname);
    // console.log('msg: ', msg);
    // console.log('type: ', type);
    // console.log('metadata: ', metadata);
    // console.log('conversationWith: ', conversationWith);
    // console.log('recipientFullname: ', recipientFullname);
    // console.log('attributes: ', attributes);
    // console.log('projectid: ', projectid);
    // console.log('channel_type: ', channel_type);

    if (attributes) {
      // this.g.wdLog(['attributes:: ', attributes.toString()]);
      // console.log('attributes: ', attributes);
    }
    // const messageString = urlify(msg);
    if (!senderFullname || senderFullname === '' ) {
      senderFullname = 'Guest';
    }
    if (!recipientFullname || recipientFullname === '' ) {
      recipientFullname = 'Guest';
    }
    const that = this;
    // const now: Date = new Date();
    // const localTimestamp = now.valueOf();
    // const timestamp = firebase.database.ServerValue.TIMESTAMP;
    // const language = navigator.language;
    // const dateSendingMessage = setHeaderDate(timestamp);
    const message = new MessageModel(
      '',
      // language,
      conversationWith,
      recipientFullname,
      senderId,
      senderFullname,
      '',
      metadata,
      msg,
      // timestamp,
      // dateSendingMessage,
      type,
      attributes,
      channel_type,
      projectid
    );
    // this.messages.push(message);
    const __urlMessages = '/apps/' + tenant + '/users/' + senderId + '/messages/';
    // const conversationRef = firebase.database().ref(__urlMessages + conversationWith);
    // console.log('>>> url messaggio: ', __urlMessages + conversationWith);
    // console.log('message: ', message);

    // firebaseMessagesCustomUid.push(message, function(error) {
    //   if (error) {
    //     // cambio lo stato in rosso: invio nn riuscito!!!
    //     message.status = '-100';
    //      that.g.wdLog(['ERRORE', message);
    //   } else {
    //     // that.checkWritingMessages();
    //     message.status = '150';
    //      that.g.wdLog(['OK MSG INVIATO CON SUCCESSO AL SERVER', message);
    //   }


    // const messageRef = conversationRef.push();
    // const key = messageRef.key;
    // message.uid = key;
    //  that.g.wdLog(['messageRef: ', messageRef]);
    // const messageForFirebase = message.asFirebaseMessage();
    // // console.log("messageForFirebase ", messageForFirebase)
    //  that.g.wdLog(['messageForFirebase: ', messageForFirebase]);
    // messageRef.set(messageForFirebase, function (error) {
      // Callback comes here
    //   if (error) {
    //     // cambio lo stato in rosso: invio nn riuscito!!!
    //     message.status = '-100';
    //      that.g.wdLog(['ERRORE', error]);
    //   } else {
    //     // that.checkWritingMessages();
    //     message.status = '150';
    //     that.g.wdLog(['OK MSG INVIATO CON SUCCESSO AL SERVER', message]);
    //   }
    //   //   that.g.wdLog(['****** changed *****', that.messages);
    // });



    // this.checkWritingMessages();
    // const newMessageRef = firebaseMessagesCustomUid.push();
    // newMessageRef.set(message);
    // se non c'è rete viene aggiunto al nodo in locale e visualizzato
    // appena torno on line viene inviato!!!

    // if (!this.firebaseGroupMenbersRef) {
    // this.checkRemoveMember();
    // }
    // return newMessageRef.key;
    return message;
  }



  /**
   * check if conversation exists, subscibing conversations node
   * if conversation is removed (closed by agent)
   * call closeConversation and start modal Rating conversation
   */
  private checkRemoveConversation(conversationWith) {
    const that = this;
    // this.conversationsRef = firebase.database().ref(this.urlConversation);
    // this.conversationsRef.on('child_removed', function (snap) {
    //    that.g.wdLog(['child_removed ***********************', snap.key, snap.val()]);
    //   if (snap.key === conversationWith) {
    //     that.closeConversation();
    //   }
    // });
  }

  /**
   * pass osservable var starRatingWidgetService in conversation
   * for open rating chat modal
   */
  closeConversation() {
    this.g.wdLog(['MessagingService::closeConversation', 'conversation closed']);
    this.starRatingWidgetService.setOsservable(true);
  }

  /**
   *
   */
  generateUidConversation(uid): string {
    // this.firebaseMessagesKey = firebase.database().ref(this.urlMessages);
    // creo il nodo conversazione generando un custom uid
    // const newMessageRef = this.firebaseMessagesKey.push();
    // const key = UID_SUPPORT_GROUP_MESSAGES + newMessageRef.key;
    // sessionStorage.setItem(uid, key);
    // this.g.wdLog(['setItem ************** UID:', uid, ' KWY: ', key]);
    // // this.storageService.setItem(uid, key);
    // this.conversationWith = key;
    // return key;
    const key = '12345'
    sessionStorage.setItem(uid, key);
    this.conversationWith = key;
    return key;
  }

  /**
   * purifico il messaggio
   * e lo passo al metodo di invio
   */
  private controlOfMessage(messageString): string {
    // let messageString = document.getElementById('textarea')[0].value;
    this.g.wdLog(['controlOfMessage **************', messageString]);
    messageString = messageString.replace(/(\r\n|\n|\r)/gm, '');
    if (messageString.trim() !== '') {
      return messageString;
    }
    return '';
  }


  /** */
  // setRating(rate) {
  //    that.g.wdLog(['setRating **************', rate);
  //   this.observableWidgetActive.next(false);
  // }

  /** */
  updateMetadataMessage(uid, metadata) {
    metadata.status = true;
    const message = {
      metadata: metadata
    };
    // const firebaseMessages = firebase.database().ref(this.urlMessages + uid);
    // firebaseMessages.set(message);
  }




  // BEGIN TYPING FUNCTIONS
  /**
   */
  initWritingMessages(conversationWith) {
    this.conversationWith = conversationWith;
    this.urlNodeTypings = '/apps/' + this.tenant + '/typings/' + conversationWith;
    // console.log('checkWritingMessages', this.urlNodeTypings);
  }

  /**
   * check if agent writing
   */
  getWritingMessages() {
    const that = this;
    // console.log('------------- getWritingMessages -----------', that.urlNodeTypings);
    // const ref = firebase.database().ref(that.urlNodeTypings).orderByChild('timestamp').limitToLast(100);
    // ref.on('child_changed', function(childSnapshot) {
    //     // that.events.publish('isTypings', childSnapshot);
    //     // console.log('------------- getWritingMessages child_changed -----------');
    //     that.obsTyping.next(childSnapshot);
    // });
  }

  /**
   */
  setWritingMessages(str, channel_type?) {
    const that = this;
    this.setTimeoutWritingMessages = setTimeout(function () {
      let readUrlNodeTypings = that.urlNodeTypings;
      if (channel_type === CHANNEL_TYPE_GROUP) {
        readUrlNodeTypings = that.urlNodeTypings + '/' + that.senderId;
        // console.log('GRUPPO', readUrlNodeTypings);
      }
      // console.log('setWritingMessages:', readUrlNodeTypings);
      // const timestamp =  firebase.database.ServerValue.TIMESTAMP;
      // const precence = {
      //   'timestamp': timestamp,
      //   'message': str
      // };
      // firebase.database().ref(readUrlNodeTypings).set(precence, function( error ) {
      //   if (error) {
      //     console.log('ERRORE', error);
      //   } else {
      //     // console.log('OK update typing');
      //   }
      // });
    }, 500);
  }
  // END TYPING FUNCTIONS


  /**
   * called on ondestroy from component 'conversation'
   * detach all callbacks firebase on messagesRef
   */
  unsubscribeAllReferences() {
    this.g.wdLog(['--------> messagesRef.off']);
    // this.messagesRef.off();
    // this.conversationsRef.off('child_removed');
  }




  // ========= START:: TRIGGER FUNCTIONS ============//
  /** */
  private triggerGetImageUrlThumb(message: MessageModel) {
    try {
      const windowContext = this.g.windowContext;
      const triggerGetImageUrlThumb = new CustomEvent('getImageUrlThumb', { detail: { message: message } });
      if (windowContext.tiledesk && windowContext.tiledesk.tiledeskroot) {
        windowContext.tiledesk.tiledeskroot.dispatchEvent(triggerGetImageUrlThumb);
      } else {
        // this.el.nativeElement.dispatchEvent(triggerGetImageUrlThumb);
      }
    } catch (e) {
      this.g.wdLog(['> Error :' + e]);
    }
  }

  /** */
  private triggerOnMessageCreated( message: MessageModel) {
    this.g.wdLog([' ---------------- triggerOnMessageCreated ---------------- ', message]);
    const onMessageCreated = new CustomEvent('onMessageCreated', { detail: { message: message } });
    const windowContext = this.g.windowContext;
    if (windowContext.tiledesk && windowContext.tiledesk.tiledeskroot) {
        windowContext.tiledesk.tiledeskroot.dispatchEvent(onMessageCreated);
        this.g.windowContext = windowContext;
    } else {
        // this.el.nativeElement.dispatchEvent(onMessageCreated);
    }
  }
  // ========= END:: TRIGGER FUNCTIONS ============//

}
