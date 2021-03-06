import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  StatusBar,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import * as tf from '@tensorflow/tfjs'
// require('@tensorflow/tfjs-node')
import { fetch, bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as jpeg from 'jpeg-js'
import * as ImagePicker from 'expo-image-picker'
import Constants from 'expo-constants'
import * as Permissions from 'expo-permissions'
import ImageResizer from 'react-native-image-resizer';
import axios from 'axios'
import { connect } from "react-redux";

import GetCoverImage from "../GetCoverImage"
import AllClasses from "../classes.js"


const CONFIG = {
  allowsEditing: true,
  aspect: [1, 1]
};

// const IMAGENET_CLASSES = {
//   0: 'Tomato___Bacterial_spot',
//   1: 'Tomato___Late_blight',
//   2: 'Tomato___Tomato_mosaic_virus',
//   3: 'Tomato___Target_Spot',
//   4: 'Tomato___Leaf_Mold',
//   5: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
//   6: 'Tomato___Early_blight',
//   7: 'Tomato___Spider_mites Two-spotted_spider_mite',
//   8: 'Tomato___Septoria_leaf_spot',
//   9: 'Tomato___healthy'
// }

class ImageInput extends React.Component {

  state = {
    showDisplay: true,
    isTfReady: false,
    isModelReady: false,
    predictions: null,
    image: null,
    uri: null,
    classes: {}
  }

  


  async componentDidMount() {

    this.setState({classes: AllClasses[this.props.model]})
    console.log(this.props.model)
    await tf.ready()
    this.setState({
      isTfReady: true
    })
    // console.log(this.props)

    // this.model = await mobilenet.load() // ORIGINALLY LOADING MOBILE NETS
    this.model = await this.loadModel(this.props.model)
    console.log('model after fetch: ' + this.model)
    // this.loadModel('tfjs_model_to_use')
    this.setState({ isModelReady: true })
    // this.camperm()
    // this.camrollperm()
    this.getPermissionAsync()
  }

  loadModel = async (name) => {
    // model = undefined; 
    // console.log('weowi;rjg')
    
    try {
      let modelJson
      let modelWeights
      switch (name) {
        case 'Tomato':
          modelJson = require('../assets/tfjs_model_to_use_trained/model.json')
          modelWeights = require('../assets/tfjs_model_to_use_trained/group1-shard1of1.bin')
          break
        case 'Apple':
          modelJson = require('../assets/apple_model/model.json')
          modelWeights = require('../assets/apple_model/group1-shard1of1.bin')
          break
        case 'Cherry':
          modelJson = require('../assets/cherry_model/model.json')
          modelWeights = require('../assets/cherry_model/group1-shard1of1.bin')
          break
        case 'Corn':
          modelJson = require('../assets/corn_model/model.json')
          modelWeights = require('../assets/corn_model/group1-shard1of1.bin')
        case 'Grape':
          modelJson = require('../assets/grape_model/model.json')
          modelWeights = require('../assets/grape_model/group1-shard1of1.bin')
        case 'Potato':
          modelJson = require('../assets/potato_model/model.json')
          modelWeights = require('../assets/potato_model/group1-shard1of1.bin')
        case 'Strawberry':
          modelJson = require('../assets/strawberry_model/model.json')
          modelWeights = require('../assets/strawberry_model/group1-shard1of1.bin')
      }
      
      // the quantization has reduced all the shard weights to one file. Before I think it was like 32 or so different files!
      console.log('fetching now')
      return await tf.loadLayersModel(bundleResourceIO(modelJson, modelWeights))//'file://tfjs-models/tfjs_model_to_use/content/tfjs_model_to_use/model.json')//'https://storage.googleapis.com/tfjs-models/tfjs/iris_v1/model.json')
      // local load look at google's main example - why cant it resolve .bin?
      // online load, server?
    }
    catch (error) {
      console.log('dfslkmlsemo')
      console.log(error)
    }
    // model = await tf.loadModel('../tfjs-models/tfjs_model_to_use/content/tfjs_model_to_use/model.json')//(`http://localhost:81/tfjs-models/${name}/model.json`); //replace localhost w/ 10.0.0.14
  }

  // camperm = async() => {
  //   if (Constants.platform.ios) {
  //     const { statusCam } = await Permissions.askAsync(Permissions.CAMERA)
  //     if (statusCam !== 'granted') {
  //       alert('Sorry, we need camera permissions to make this work!')
  //     }
  //   }
  // }

  // camrollperm = async () => {

  //     const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL)
  //     if (status !== 'granted') {
  //       alert('Sorry, we need camera roll permissions to make this work!')
  //     }
  // }

  getPermissionAsync = async () => {
    const { status } = await Permissions.askAsync(
      Permissions.CAMERA_ROLL,
      Permissions.CAMERA
    )
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!')
    }
  }

  imageToTensor(rawImageData) {
    const TO_UINT8ARRAY = true
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY)

    // Drop the alpha channel info for mobilenet
    const buffer = new Uint8Array(width * height * 3)
    let offset = 0 // offset into original data
    for (let i = 0; i < buffer.length; i += 1) {
      buffer[i] = data[offset]
      buffer[i + 1] = data[offset + 1]
      buffer[i + 2] = data[offset + 2]

      offset += 1
    }

    const tensa = tf.tensor4d(buffer, [1, height, width, 3])
    const tensb = tf.image.resizeNearestNeighbor(tensa, [128, 128])
    console.log(tensb.shape)
    return tensb

  }

  classifyImage = async () => {
    try {
      this.setState({ showDisplay: false })
      const imageAssetPath = Image.resolveAssetSource(this.state.image)
      const response = await fetch(imageAssetPath.uri, {}, { isBinary: true })
      const rawImageData = await response.arrayBuffer()
      const imageTensor = this.imageToTensor(rawImageData)
      // const imageTensor = decodeJpeg(rawImageData);
      // const predictions = (await this.model.predict(imageTensor))[0];
      const prepred = await this.model.predict(imageTensor).data()
      const arr = Array.from(prepred)
      console.log(arr[0])
      var max = arr[0];
      var maxIndex = 0;

      for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
          maxIndex = i;
          max = arr[i];
        }
      }


      // let top3 = arr
      //   .map(function (p, i) {
      //       return {
      //           probability: p,
      //           className: IMAGENET_CLASSES[i]
      //       };
      //   }).sort(function (a, b) {
      //       return b.probability - a.probability;
      //   }).slice(0, 3);

      console.log('max: ' + maxIndex)
      console.log(this.state.classes[maxIndex])
      this.setState({ predictions: this.state.classes[maxIndex] })
      this.saveToHistory(this.state.uri, this.state.classes[maxIndex])

      this.props.navigation.navigate("ImageOutput", { uri: this.state.uri, predictions: this.state.classes[maxIndex] })

      this.setState({ showDisplay: true })
      // console.log("pred " + predictions)
      // console.log(predictions)

    } catch (error) {
      console.log(error)
    }
  }

  saveToHistory = (uri, diag) => {
    this.props.dispatch({ type: 'ADDDIAG', diagnosis: { uri: uri, diag: diag, plant: this.props.model } });
  };

  // }
  selectImage = async () => {
    let resp = await ImagePicker.launchImageLibraryAsync(
      {
        allowsEditing: true,
        aspect: [1, 1]
      }
    )
    if (resp) {
      const source = { uri: resp.uri }
      this.setState({ image: source, uri: resp.uri });
      this.classifyImage()
    }
  }


  takePhoto = async () => {
    const resp = await ImagePicker.launchCameraAsync(CONFIG);
    if (resp) {
      const source = { uri: resp.uri }
      this.setState({ image: source, uri: resp.uri })
      this.classifyImage()
    }
  };

  renderPrediction = prediction => {
    // console.log(prediction)
    return (
      <Text key={prediction.className} style={styles.text}>
        {prediction.className}
      </Text>
    )
  }

  render() {
    const { isTfReady, isModelReady, predictions, image, uri } = this.state
    

    if (this.state.showDisplay) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={{ fontSize: 40, top: 7, fontWeight: 'bold',  }}>{this.props.model} Disease Detection</Text>
            <View style={styles.loadingModelContainer}>
              <Text style={styles.text}>Please wait for the model to load: </Text>
              {isModelReady ? (
                <Text style={styles.text}>✅</Text>
              ) : (
                  <ActivityIndicator size='small' />
                )}
            </View> 
          </View>

          <View style={styles.imageContainer}>
            <GetCoverImage plant= {this.props.model} screen = "ImageInput"/>
          </View>
          <View>
            <TouchableOpacity
              disabled={isModelReady ? (false) : (true)}
              style={isModelReady ? (styles.imageWrapper) : (styles.imageWrapperDisabled)}
              onPress={isModelReady ? this.takePhoto : undefined}
            >

              {(
                <Text style={styles.choosetext} >Take a photo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isModelReady ? (false) : (true)}
              style={isModelReady ? (styles.imageWrapper) : (styles.imageWrapperDisabled)}
              onPress={isModelReady ? this.selectImage : undefined}>

              {(
                <Text style={styles.choosetext}>Upload photo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imageWrapper}
              onPress={() => {
                console.log('Going to history for ' + this.props.model)
                this.props.navigation.navigate("History", {plant: this.props.model})
              }
                
                
              }
            >
                <Text style={styles.choosetext}>View Previous {this.props.model} Diagnoses</Text>
            </TouchableOpacity>
            <TouchableOpacity
                    // style={styles2.ismageWrapper}
                    onPress={() => { this.props.navigation.navigate("PlantInfo") }}>
                    {/* was originally styles.choosetext */}
                    <Text style={{ color: '#009900', fontWeight: 'bold', fontSize: 20 }}>{"\nBack"} </Text>
                </TouchableOpacity>

          </View>
          {/* <Text>{predictions}</Text>       */}
        </View>
      )
    } else {
      return (
        <View style={styles.container} justifyContent='center'>
          <Image
            style={styles.loadingImg}
            source={require('../assets/loadingImg.gif')}
          />
          <Text style = {{fontSize: 20}}>Running Disease Analysis :)</Text>
        </View>
      )
    }


  }
}

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 65,
    // backgroundColor: '#171f24',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingContainer: {
    marginTop: 80,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingImg: {
    height: 200,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    // color: '#ffffff',
    fontSize: 20,
    top: 20,
    marginBottom: 40,
    
  },
  choosetext: {
    fontWeight: "bold",
    color: '#ffffff',
    fontSize: 20
  },
  loadingModelContainer: {
    flexDirection: 'row',
    marginTop: 10
  },
  imageWrapper: {
    width: 400,
    height: 80,
    padding: 10,
    borderRadius: 10,
    // borderStyle: 'dashed',
    marginTop: 20,
    backgroundColor: '#009900',
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageWrapperDisabled: {
    width: 400,
    height: 80,
    padding: 10,
    borderRadius: 5,
    // borderStyle: 'dashed',
    marginTop: 20,
    backgroundColor: '#949399',
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageContainer: {
    width: 400,
    height: 400,

    position: 'relative',
    marginTop: 10,
    // marginBottom: 15,
    // top: 10,
    // left: 10,
    // bottom: 10,
    // right: 10,
  },
  predictionWrapper: {
    height: 100,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center'
  },
  // transparentText: {
  //   color: '#ffffff',
  //   opacity: 0.7
  // },
  footer: {
    marginTop: 40
  },
  poweredBy: {
    fontSize: 20,
    color: '#e69e34',
    marginBottom: 6
  },
  tfLogo: {
    width: 125,
    height: 70
  }
})

function mapStateToProps(state) {
  return {
    // becomes the props for this component via connect()
    diagnoses: state.diagnoses,
    model: state.model
    // sometimes you can just pass the whole state through but its better to filter
  };
}

export default connect(mapStateToProps)(ImageInput);
// export default ImageInput

// import React, {useState, useEffect} from 'react';
// import { StyleSheet, Text, View, Picker, FlatList,Image,Button, TouchableHighlight, ActivityIndicator,
//   StatusBar,
//   TouchableOpacity } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import * as Permissions from 'expo-permissions';
// import * as tf from '@tensorflow/tfjs'
// import { fetch } from '@tensorflow/tfjs-react-native'
// import * as mobilenet from '@tensorflow-models/mobilenet'
// import * as jpeg from 'jpeg-js'
// import Constants from 'expo-constants'

// export default function ImageInput(props) {

//   const [uri, setUri] = useState(null);
//   const [image, setImage] = useState(null)
//   const [predictions, setPredictions] = useState(null)
//   const [isModelReady, setisModelReady] = useState(false)
//   // state = {
//   //   isTfReady: false,
//   //   isModelReady: false,
//   //   predictions: null,
//   //   image: null
//   // }

//   const CONFIG = {
//     allowsEditing: true,
//     aspect: [4,3]
//   };

//   const componentDidMount = async () => {
//     await tf.ready()
//     setisModelReady(false)
//     this.model = await mobilenet.load()
//     setisModelReady(true)
//     this.getPermissionAsync()
//   }

//   const imageToTensor = (rawImageData) => {
//     const TO_UINT8ARRAY = true
//     const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY)
//     // Drop the alpha channel info for mobilenet
//     const buffer = new Uint8Array(width * height * 3)
//     let offset = 0 // offset into original data
//     for (let i = 0; i < buffer.length; i += 3) {
//       buffer[i] = data[offset]
//       buffer[i + 1] = data[offset + 1]
//       buffer[i + 2] = data[offset + 2]

//       offset += 4
//     }

//     return tf.tensor3d(buffer, [height, width, 3])
//   }

//   const classifyImage = async () => {
//     try {
//       const imageAssetPath = Image.resolveAssetSource(image)
//       const response = await fetch(imageAssetPath.uri, {}, { isBinary: true })
//       const rawImageData = await response.arrayBuffer()
//       const imageTensor = this.imageToTensor(rawImageData)
//       const new_predictions = await this.model.classify(imageTensor)
//       setPredictions(new_predictions)
//       console.log(predictions)
//     } catch (error) {
//       console.log(error)
//     }
//   }

//   const renderPrediction = prediction => {
//     return (
//       <Text key={prediction.className}>
//         {prediction.className}
//       </Text>
//     )
//   }
//   // ---------------------------------------------------------------
//   useEffect(() => {
//     (
//       async () => {
//       const { status } = await Permissions.askAsync(Permissions.CAMERA);
//       // setHasPermission(status === 'granted');

//     }
//   )();
//   (
//     async () => {
//     const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
//     // setHasPermission(status === 'granted');

//   }
//   )();
//   }, []);

//   const openCamera = async () => { const resp = await ImagePicker.launchCameraAsync(CONFIG);
//     if (resp) {
//       console.log(resp.uri);
//         setUri(resp.uri);
//     }
//   };

//   const openCameraRoll = async () => {
//     const resp = await ImagePicker.launchImageLibraryAsync(CONFIG);
//     if (resp){
//       setUri(resp.uri);
//     }
//   };








//   //hey

//   return (
//       <View>
//         <Image style  = {{width:65, height: 65, margin: 50, padding: 50}} source = {require('../assets/tomatoicon.png')}/>
//         <Text  style={{textAlignVertical: "center",textAlign: "center",fontWeight:"bold",fontSize:50,}}>Tomato</Text>
//         <TouchableHighlight
//             // title="Upload Image"
//             style = {styles.button}
//               onPress={openCameraRoll}
//         >
//             <Text>Upload Image</Text>
//         </TouchableHighlight>

//         <TouchableHighlight
//             // title="Upload Image"
//             style = {styles.button}
//               onPress={openCamera}
//         >
//             <Text>Take Photo</Text>
//         </TouchableHighlight>
//         <Text>{uri}</Text>

//   { uri && <Image style  = {{width:200, height: 200, margin: 50, padding: 50}} source = {{ uri: uri}}/> }
//         {/* displaying image if uri exists, src weirdly takes an object of the uri*/}


//         <View>
//       {isModelReady && image && (
//         <Text>
//           Predictions: {predictions ? '' : 'Predicting...'}
//         </Text>
//       )}
//       {isModelReady &&
//         predictions &&
//         predictions.map(p => renderPrediction(p))}
//       </View>


//       </View>


//     );
// }




// const styles = StyleSheet.create({
//     container: {
//       flex: 1,
//       justifyContent: 'center',
//       paddingHorizontal: 10
//     },
//     button: {
//       alignItems: 'center',
//       backgroundColor: '#DDDDDD',
//       padding: 10
//     },
//     countContainer: {
//       alignItems: 'center',
//       padding: 10
//     },
//     countText: {
//       color: '#FF00FF'
//     }
//   })
