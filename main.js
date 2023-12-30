const APP_ID = "e3a2585703fe4425971da58ef6a7d766";

let token = null;
const uid =  String(Math.floor(Math.random() * 10000));

let client;
let channel;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
const roomId = urlParams.get('room')

if(!roomId){
  window.location = 'lobby.html'
}



let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

const constraints = {
  video: 
  {
    "width": {
        "min": 300,
       
        "max": 1920
    },
    "height": {
        "min": 480,
       
        "max": 1080
    }
},audio:true
}
const init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid,token });

  //index.html?room=23456
  channel = client.createChannel(roomId);
  await channel.join();

  channel.on('MemberJoined',handleUserJoined)

  client.on('MessageFromPeer',handleMessageFromPeer)

  channel.on('MemberLeft', handleUserLeft);

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById("user-1").srcObject = localStream;

};

const handleUserLeft = async(MemberId)=>{
 
  document.getElementById("user-2").style.display = 'none'
  document.getElementById("user-1").classList.remove('smallframe')
}
const handleMessageFromPeer = async(message,MemberId)=>{
    message = JSON.parse(message.text)
   if(message.type === 'offer'){
    createAnswer(MemberId,message.offer)
   }

   if(message.type === 'answer'){
    addAnswer(message.answer)
   }

   if(message.type === 'candidate'){
    if(peerConnection){
      peerConnection.addIceCandidate(message.candidate)
    }
   }
}
const handleUserJoined = async(MemberId)=>{
    // console.log(`A new user with id ${MemberId} has joined`)
    createOffer(MemberId)
  }

  const createPeerConnection = async(MemberId)=>{
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById("user-2").srcObject = remoteStream;
    document.getElementById("user-2").style.display = 'block'
    document.getElementById("user-1").classList.add('smallframe')
  
    if(!localStream){
      localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        document.getElementById("user-1").srcObject = localStream;
    }
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };
  
    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
          client.sendMessageToPeer({text:JSON.stringify({"type":"candidate","candidate":event.candidate})},MemberId)
      }
    };
  }
const createOffer = async (MemberId) => {
 await createPeerConnection(MemberId)

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  client.sendMessageToPeer({text:JSON.stringify({"type":"offer","offer":offer})},MemberId)
};

const createAnswer = async(MemberId,offer)=>{

  await createPeerConnection(MemberId)
  await peerConnection.setRemoteDescription(offer)

  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)

  client.sendMessageToPeer({text:JSON.stringify({"type":"answer","answer":answer})},MemberId)
}

const addAnswer = async(answer)=>{
  if(!peerConnection.currentRemoteDescription){
    peerConnection.setRemoteDescription(answer)
  }
}

const leaveChannel = async(e)=>{
  //e.preventDefault();
  await channel.leave()
  await client.logout()
}

const toggleCamera = async()=>{
  const videoTrack = localStream.getTracks().find(track=>track.kind === 'video')
  if(videoTrack.enabled){
    videoTrack.enabled = false 
    document.getElementById('camera-btn').src = 'disabled-camera-icon.jpeg'
  }else{
    videoTrack.enabled = true 
    document.getElementById('camera-btn').src = 'camera-icon.png'
  }
}

const toggleMic = async()=>{
  const audioTrack = localStream.getTracks().find(track=>track.kind === 'audio')
  if(audioTrack.enabled){
    audioTrack.enabled = false 
    document.getElementById('mic-btn').src = 'disabled-mic-icon.jpeg'
  }else{
    audioTrack.enabled = true 
    document.getElementById('mic-btn').src = 'mic-icon.jpg'
  }
}


document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)


window.addEventListener('unload',()=>{
  alert('')
  
})
window.addEventListener('beforeunload', ()=>{
  leaveChannel()
  const audioTrack = localStream.getTracks().find(track=>track.kind === 'audio')
  audioTrack.enabled = false
  document.getElementById('mic-btn').src = 'disabled-mic-icon.jpeg'
});

init();
