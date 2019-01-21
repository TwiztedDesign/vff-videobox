const WebRTC = require('./simplewebrtc.bundle');

export default class VideoBox extends HTMLElement {
    constructor() {
        super();
        this._src = '';
    }

    connectedCallback() {
        var html =
            '<div style="width: 100%; height: 100%;">'+
            '   <canvas class="canvas" style="width: 100%; height: 100%;"></canvas>'+
            '</div>';

        this.innerHTML = html;
        this.controllerPreview = false;
        this.useCanvas = false;


        if(this.src && (this.controllerPreview || window.vff.mode !== 'controller-preview')){
            this.initStream(this.src);
        }
    }

    disconnectedCallback() {
        clearInterval(this.canvasDrawTimeout);
    }

    static get observedAttributes() {
        return [];
    }

    attributeChangedCallback() {

    }

    initVideo(video /*,peer*/) {

        let self = this;

        console.info('Initialize RTC Video'); // eslint-disable-line no-console

        video.setAttribute('loop', '');
        video.muted = true;
        video.setAttribute('autoplay', 'true');
        // video.setAttribute('controls', '');


        self.videoEl = video;

        if(this.useCanvas){
            self.startDraw();
        } else {
            video.setAttribute('width', '100%');
            video.setAttribute('height', '100%');
            while (self.hasChildNodes()){
                self.removeChild(self.lastChild);
            }
            self.appendChild(video);
        }


        self.webrtc.stopLocalVideo();
        video.play();
    }

    clearVideo (/*video, peer*/) { //DOSENT WORK
        // let self = this;
        // console.log('video removed ', peer);
        // let container = document.getElementById('videoContainer');
        // if (peer !== undefined) {
        //     if (peer.id == targetId || peer.strongId == targetId || peer.nickName == targetId) {
        //         self.videoEl = null;
        //         while (container.hasChildNodes())
        //             container.removeChild(container.lastChild);
        //
        //         var videoStub = document.createElement('video');
        //         container.appendChild(videoStub);
        //     }
        // }
    }

    startDraw(){
        let self = this;
        var video  = self.videoEl;
        var canvases = Array.prototype.slice.call(document.querySelectorAll('.canvas'));
        var contexts = canvases.map(function(canvas){
            var ctx = canvas.getContext('2d');
            ctx.name = canvas.getAttribute('name');
            return ctx;
        });

        contexts.forEach(function(context) {
            context.canvas.width  = context.canvas.offsetWidth;
            context.canvas.height = context.canvas.offsetHeight;
        });

        video.addEventListener('play', function(){
            self.draw(video, contexts);
        },false);
    }


    draw(video, contexts) {
        let self = this;
        contexts = Array.isArray(contexts)? contexts : [contexts];
        if(video.paused || video.ended) return false;
        contexts.forEach(function(context) {
            if(self.isVisible()){
                context.drawImage(video, 0, 0, context.canvas.width, context.canvas.height);
            }
        });
        self.canvasDrawTimeout = setTimeout(
            function(){
                self.draw(video, contexts);
            }, 20);
    }

    isVisible() {
        return (this.offsetParent !== null);
    }



    initStream(url) {
        let self = this;

        console.log('Initialize RTC Connection:', url); // eslint-disable-line no-console
        // if(inController) return;
        // var signalingServer = self.signalingServer || "https://rtc.medialooks.com:8889";
        var signalingServer = self.signalingServer || "https://rtc.videoflow.io";
        var room = url.split("/")[0];
        var targetId = url.split("/")[1];
        if(!targetId || !room) return;

        // create webrtc connection
        if(self.webrtc){
            self.webrtc.leaveRoom();
            self.webrtc.connection.disconnect();
            self.webrtc.disconnect();
            delete self.webrtc;
        }
        self.webrtc = new WebRTC({
            target: targetId,
            url: signalingServer,
            socketio: {'force new connection':true},
            stunServer: [{urls: 'stun:stun.l.google.com:19302'}, {
                username: 'user',
                credential: 'pass',
                urls: 'turn:54.198.120.75:3478'
            }],
            localVideoEl: '',
            remoteVideosEl: '',
            autoRequestMedia: false,
            debug: false,
            detectSpeakingEvents: true,
            autoAdjustMic: false
        });

        // when it's ready, join if we got a room from the URL
        self.webrtc.on('readyToCall', function () {
            self.webrtc.setInfo('', self.webrtc.connection.connection.id, ''); // Store strongId

            if (room) {
                self.webrtc.joinRoom(room);
            }
        });

        //Handle incoming video from target peer
        console.log('Adding RTC video handler'); // eslint-disable-line no-console
        self.webrtc.on('videoAdded', function (video, peer) {
            self.initVideo(video, peer);
        });

        //Handle removing video by target peer
        self.webrtc.on('videoRemoved', function (video, peer) {
            self.clearVideo(video, peer);
        });
    }

    get group() {
        return this.getAttribute("group");
    }
    get stream() {
        return this._streamId;
    }
    get src() {
        return this.getAttribute("src") || "";
    }
    set src(value) {
        this.setAttribute('src', value);
        if(value &&
            // value !== this._src &&
            (this.controllerPreview || window.vff.mode !== 'controller-preview')){
                clearInterval(this.canvasDrawTimeout);
                this._src = value;
                this.initStream(value);
        }
    }


    expose(){
        return {
            Src  : 'src'
        };
    }

}