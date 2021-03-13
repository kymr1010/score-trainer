import { render } from "react-dom";

const importer = ()=>{
  const metaEvent={
    0x00:{name:"Sequence number",
          function:(t)=>{return getInt(t)}
        },
    0x01:{name:"Text event",
          function:(t)=>{return getChar(t)},
        },
    0x02:{name:"Copyright notice",
          function:(t)=>{return getChar(t)},
        },
    0x03:{name:"Sequence or track name",
          function:(t)=>{return getChar(t)},
        },
    0x04:{name:"Instrument name",
          function:(t)=>{return getChar(t)},
        },
    0x05:{name:"Lyric text",
          function:(t)=>{return getChar(t)},
        },
    0x06:{name:"Marker text",
          function:(t)=>{return getChar(t)},
        },
    0x07:{name:"Cue point",
          function:(t)=>{return getChar(t)},
        },
    0x08:{name:"Program Name",
          function:(t)=>{return getChar(t)},
    },
    0x09:{name:"Device Name",
          function:(t)=>{return getChar(t)},
    },
    0x20:{name:"MIDI channel prefix assignment",
          function:null,
        },
    0x21:{name:"Port",
        function:null,
    },
    0x2F:{name:"End of track",
          function:null,
        },
    0x51:{name:"Tempo setting",
          function:(t)=>{return 60000000/getInt(t)},
        },
    0x54:{name:"SMPTE offset",
          function:null,
        },
    0x58:{name:"Time signature",
          function:null,
        },
    0x59:{name:"Key signature",
          function:(t)=>{return getKey(t[0],t[1])},
        },
    0x7F:{name:"Sequencer specific event",
          function:null,
        },
  };
  const MIDIEvent={
    0x80:{name:"Note off",
          function:(t)=>{return {key:t[0],velocity:t[1]}}
    },
    0x90:{name:"Note on",
          function:(t)=>{return {key:t[0],velocity:t[1]}}
    },
    0xA0:{name:"Polyphonic aftertouch",
          function:(t)=>{return {key:t[0],velocity:t[1]}}
    },
    0xB0:{name:"Control mode change",
          function:(t)=>{return {function:t[0],value:t[1]}}
    },
    0xC0:{name:"Program change",
          function:(t)=>{return {Program:t[0]}}
    },
    0xD0:{name:"Channel aftertouch",
          function:(t)=>{return {pressure:t[0]}}
    },
    0xE0:{name:"Pitch wheel range",
          function:(t)=>{return {LSB:t[0],MSB:t[1]}}
    },
    0xF0:{nume:"SysEx",
          function:(t)=>{return {data:t}}
    },
  };
  const getInt = (ar) => {
    var value = 0;
    for (var  i=0;i<ar.length;i++){
        value = (value << 8) + ar[i];
    }
    return value;
  };
  const getChar = (ar) => {
      var value = 0;
      for (var  i=0;i<ar.length;i++){
          value += String.fromCharCode(ar[i]);
      }
      return value;
  };
  const getxInt = (ar)=>{
      var value = 0;
      for (var  i=0;i<ar.length;i++){
          value = (value << 8) + ar[i];
      }
      return value.toString(16);
  };
  const getDeltaTime = (ar)=>{
    var value=0;
    var i=0;
    while(ar[i]>=0x80){
      var a = (ar[i]&0x7F);
      value = value<<7|a;
      i++;
    }
    //最後の値を連結
    value = value<<7|ar[i];
    //計算したデルタタイムと配列の残りをリターン
    return {ar:ar.subarray(i+1),deltatime:value}
  };
    const getKey=(num,mi)=>{
    let t,m;
    if(mi){
        m="minor";
    }else{
        m="major";
    }
    if(num>240)num-=256;
    switch(num){
        case 0: t='C';  break;
        case 1: t='G';  break;
        case 2: t='D';  break;
        case 3: t='A';  break;
        case 4: t='E';  break;
        case 5: t='B';  break;
        case 6: t='F#'; break;
        case 7: t='C#'; break;
        case -1:t='F';  break;
        case -2:t='B♭'; break;
        case -3:t='E♭'; break;
        case -4:t='A♭'; break;
        case -5:t='D♭'; break;
        case -6:t='G♭'; break;
        case -7:t='C♭'; break;
    }
    return {key:t,mi:m};
  }
  const parceMIDIData = (data)=>{
    const header ={
      //チャンクタイプ
      chunktype:getxInt(data.subarray(0,4)),
      //ヘッダサイズ
      size :getInt(data.subarray(4,8)),
      //SMFフォーマット
      format : getInt(data.subarray(8,10)),
      //トラックの数
      tracksize : getInt(data.subarray(10,12)),
      //時間単位
      timeunit : getInt(data.subarray(12,14)),
    };
    data=data.subarray(14);
    let track=new Array(header.tracksize);
    let trackNum=1;
    let maxNoteNum=0;
    for(let i=0;i<track.length;i++){
      track[i]={
        name:"track"+i,
        chunktype:getxInt(data.subarray(0,4)),
        size:getInt(data.subarray(4,8)),
        data:null,
      }
      track[i].data=data.subarray(8,track[i].size+8);
      
      data=data.subarray(track[i].size+8);
      
      track[i].data=trackParcer(track[i].data);
      
      // let tmp=0
      // if("Note on" in this.track[i].data)
      //     tmp=track[i].data["Note on"].length;

      // if(maxNoteNum<tmp){
      //     trackNum=i;
      //     maxNoteNum=tmp;
      // }
    }
    const scoreData={
        header:header,
        track:track,
    }
    return scoreData;
  };

  const trackParcer = (data)=>{
    let track={all:[]};
    let delta=0;
    while(data.length>0){
      //getdeltatime
      let d=getDeltaTime(data);
      data=d.ar;

      if(data[0]==255){//meta event
        let eventname,size;
        let t={
          tick:delta+d.deltatime,
          duration:d.deltatime,
          data:null,
        }
        if(data[1] in metaEvent){
          eventname=metaEvent[data[1]].name;
          size=data[2];
          if(metaEvent[data[1]].function)
          t.data=metaEvent[data[1]].function(data.subarray(3,3+size));
          else
          t.data=data.subarray(3,3+size);
        }
        if(!(eventname in track)){
            track[eventname]=[];
        }
        track[eventname].push(t);
        track['all'].push({eventname:eventname,...t});
        delta=t.tick;
        data=data.subarray(3+size);
        if(eventname==="End of track")return track;
      }else{//midi event
        let eventname,size,tmp=data[0];
        let t={
          tick:delta+d.deltatime,
          duration:0,
          channel:tmp&0x0F,
          data:null,
        }
        tmp=tmp&0xF0;
        if(tmp in MIDIEvent){
          eventname=MIDIEvent[tmp].name;
          size=(tmp==0xC0||tmp==0xD0)?2:3;
          if(MIDIEvent[tmp].function){
            t.data=MIDIEvent[tmp].function(data.subarray(1,1+size));
          } else {
            t.data=data.subarray(1,1+size);
          }
        }
        if(!(eventname in track)){
          track[eventname]=[];
        }
        track[eventname].push(t);
        track['all'].push({eventname:eventname,...t});
        delta=t.tick;
        data=data.subarray(size);
      }
    }
    return track;
  };

  const fetchFileData = (file)=>{
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      console.log(file.name + ' loading');
      reader.readAsArrayBuffer(file);
      reader.onload = () => {   
        //読み込んだ結果を型付配列に
        var array = new Uint8Array(reader.result);
        return resolve(array);
      };
      render.onellor = (e) => reject(e);
    });
  };

  const parceFileDataToScoreData = async (file)=> {
    const data = await fetchFileData(file).catch(e=>console.error(e));
    const scoreData = parceMIDIData(data);
    return scoreData;
  };
  return {
    parceFileDataToScoreData,
  };
}

export default importer;