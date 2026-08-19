import * as React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Asset } from 'expo-asset';

const THEME = '#7C3AED';

export default function VideoCreator({ visible, onClose, scenes, audioBase64, brandName }) {
  const [status, setStatus] = React.useState('preparing');
  const [videoPath, setVideoPath] = React.useState(null);
  const [videoSize, setVideoSize] = React.useState(0);
  const webviewRef = React.useRef(null);
  const htmlRef = React.useRef(null);

  React.useEffect(() => {
    if (visible && scenes && audioBase64) {
      setStatus('preparing');
      setVideoPath(null);
      loadHtmlAndStart();
    }
  }, [visible, scenes, audioBase64]);

  const loadHtmlAndStart = async () => {
    try {
      // Load the HTML file from assets
      const asset = Asset.fromModule(require('../src/videoRenderer.html'));
      await asset.downloadAsync();
      htmlRef.current = asset.localUri || asset.uri;
    } catch (err) {
      // Fallback: inline HTML
      htmlRef.current = null;
    }
  };

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'video_complete') {
        setStatus('saving');
        setVideoSize(data.size);
        
        // Save video to file system
        const fileName = `contentai_video_${Date.now()}.mp4`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, data.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        setVideoPath(fileUri);
        setStatus('done');
      }
    } catch (err) {
      setStatus('error');
      Alert.alert('Video creation failed', err.message);
    }
  };

  const handleWebViewLoad = () => {
    if (webviewRef.current && scenes && audioBase64) {
      const message = JSON.stringify({
        type: 'render',
        scenes: scenes,
        audioBase64: audioBase64,
        brandName: brandName || '',
      });
      webviewRef.current.postMessage(message);
    }
  };

  const handleShare = async () => {
    if (!videoPath) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(videoPath, {
          mimeType: 'video/mp4',
          dialogTitle: 'Share Video',
        });
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleSaveToGallery = async () => {
    if (!videoPath) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(videoPath);
        await MediaLibrary.createAlbumAsync('ContentAI Pro', asset, false);
        Alert.alert('Saved!', 'Video saved to your photo gallery.');
      } else {
        Alert.alert('Permission needed', 'Please grant photo library access to save videos.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  // Inline HTML as fallback
  const inlineHtml = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#1a1a1a;font-family:-apple-system,sans-serif;overflow:hidden}#container{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}#canvas{display:none}#status{color:white;font-size:16px;text-align:center;padding:20px}#progress{width:200px;height:4px;background:#333;border-radius:2px;margin-top:12px;overflow:hidden}#progressBar{height:100%;background:#7C3AED;width:0%;transition:width .3s}
</style></head><body><div id="container"><div id="status">Preparing...</div><div id="progress"><div id="progressBar"></div></div></div><canvas id="canvas"></canvas><script>
const THEME='#7C3AED';const canvas=document.getElementById('canvas');const ctx=canvas.getContext('2d');canvas.width=1080;canvas.height=1920;
let receivedData=null,isRendering=false;
window.addEventListener('message',e=>{if(e.data&&e.data.type==='render'){receivedData=e.data;startRendering()}});
document.addEventListener('message',e=>{try{const d=JSON.parse(e.data);if(d.type==='render'){receivedData=d;startRendering()}}catch(err){}});

async function startRendering(){
  if(!receivedData||isRendering)return;
  isRendering=true;
  const{scenes,audioBase64,brandName}=receivedData;
  document.getElementById('status').textContent='Loading audio...';
  const audioBytes=Uint8Array.from(atob(audioBase64),c=>c.charCodeAt(0));
  const audioCtx=new AudioContext();
  const audioBuf=await audioCtx.decodeAudioData(audioBytes.buffer);
  const totalDur=audioBuf.duration;
  document.getElementById('progressBar').style.width='20%';
  document.getElementById('status').textContent='Rendering video...';
  const fps=30;const stream=canvas.captureStream(fps);
  const audioDest=audioCtx.createMediaStreamDestination();
  const src=audioCtx.createBufferSource();src.buffer=audioBuf;src.connect(audioDest);
  stream.addTrack(audioDest.stream.getAudioTracks()[0]);
  const chunks=[];const rec=new MediaRecorder(stream,{mimeType:'video/mp4',videoBitsPerSecond:4000000,audioBitsPerSecond:192000});
  rec.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data)};
  rec.onstop=()=>{
    const blob=new Blob(chunks,{type:'video/mp4'});
    const reader=new FileReader();
    reader.onloadend=()=>{
      const b64=reader.result.split(',')[1];
      document.getElementById('status').textContent='Done!';
      document.getElementById('progressBar').style.width='100%';
      window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'video_complete',base64:b64,size:blob.size,duration:totalDur}));
    };
    reader.readAsDataURL(blob);
  };
  rec.start();src.start();
  const n=scenes.length;const tps=totalDur/n;let csi=0;let sst=0;
  const st=performance.now();
  function rf(){
    const el=(performance.now()-st)/1000;
    if(el>=totalDur){rec.stop();return}
    const nsi=Math.min(Math.floor(el/tps),n-1);
    if(nsi!==csi){csi=nsi;sst=el}
    const sp=(el-sst)/tps;
    drawScene(scenes[csi],sp,csi,n,brandName);
    document.getElementById('progressBar').style.width=(20+(el/totalDur)*70)+'%';
    requestAnimationFrame(rf);
  }
  rf();
}

function drawScene(text,progress,idx,total,brand){
  const g=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  g.addColorStop(0,THEME);g.addColorStop(0.5,'#5B21B6');g.addColorStop(1,'#1a1a1a');
  ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(255,255,255,0.03)';
  for(let i=0;i<5;i++){const x=(i*250+(progress*100)%250)-100;const y=(i*400+(progress*100)%400)-100;ctx.beginPath();ctx.arc(x,y,120,0,Math.PI*2);ctx.fill()}
  const dY=80,dS=20,tDw=total*dS,dSx=(canvas.width-tDw)/2;
  for(let i=0;i<total;i++){ctx.beginPath();ctx.arc(dSx+i*dS+dS/2,dY,6,0,Math.PI*2);ctx.fillStyle=i<=idx?'#fff':'rgba(255,255,255,0.3)';ctx.fill()}
  if(brand){ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='600 32px sans-serif';ctx.textAlign='center';ctx.fillText(brand.toUpperCase(),canvas.width/2,140)}
  const fI=Math.min(progress*4,1);
  ctx.font='700 56px sans-serif';
  const mw=canvas.width-160;
  const lines=wrapText(ctx,text,mw);
  const lH=72;const tH=lines.length*lH;
  const sY=canvas.height/2-tH/2+lH/2;
  ctx.globalAlpha=fI;ctx.fillStyle='#fff';ctx.textAlign='center';
  const sO=(1-fI)*30;
  lines.forEach((l,i)=>ctx.fillText(l,canvas.width/2,sY+i*lH-sO));
  ctx.globalAlpha=1;
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='500 24px sans-serif';ctx.textAlign='center';
  ctx.fillText('Made with ContentAI Pro',canvas.width/2,canvas.height-60);
  const bW=canvas.width-200;bX=100;bY=canvas.height-120;
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(bX,bY,bW,4);
  ctx.fillStyle='#fff';ctx.fillRect(bX,bY,bW*progress,4);
}
function wrapText(ctx,text,mw){
  const words=text.split(' ');const lines=[];let cur='';
  for(const w of words){
    const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>mw&&cur){lines.push(cur);cur=w}else{cur=t}}
  if(cur)lines.push(cur);return lines.slice(0,6);
}
</script></body></html>`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Video</Text>
          <View style={{ width: 40 }} />
        </View>

        {status === 'preparing' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.statusText}>Preparing video renderer...</Text>
          </View>
        )}

        {status === 'rendering' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.statusText}>Rendering your video...</Text>
            <Text style={styles.subText}>This takes 15-30 seconds</Text>
          </View>
        )}

        {status === 'saving' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={THEME} />
            <Text style={styles.statusText}>Saving video...</Text>
          </View>
        )}

        {status === 'done' && videoPath && (
          <View style={styles.doneContainer}>
            <View style={styles.videoIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            </View>
            <Text style={styles.doneTitle}>Video Created!</Text>
            <Text style={styles.doneSize}>
              {(videoSize / 1024 / 1024).toFixed(1)} MB
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleSaveToGallery}>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Save to Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color={THEME} />
              <Text style={styles.shareBtnText}>Share Video</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF3B30" />
            <Text style={styles.statusText}>Video creation failed</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
              <Text style={styles.retryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hidden WebView for rendering */}
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
          <WebView
            ref={webviewRef}
            source={{ html: inlineHtml }}
            onMessage={handleMessage}
            onLoad={handleWebViewLoad}
            javaScriptEnabled={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            style={{ width: 1, height: 1 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#1a1a1a' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  statusText: { fontSize: 16, color: '#fff', marginTop: 16 },
  subText: { fontSize: 14, color: '#999', marginTop: 8 },
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  videoIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(52,199,89,0.15)', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 16 },
  doneSize: { fontSize: 14, color: '#999', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 12 },
  shareBtnText: { color: THEME, fontWeight: '600', fontSize: 15 },
  retryBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: THEME, borderRadius: 12 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
