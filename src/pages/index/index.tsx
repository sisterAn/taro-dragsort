import { ComponentClass } from 'react'
import Taro, {Component} from '@tarojs/taro'
import { View, Image, Text, ScrollView, Input, Textarea, Video, Button, MovableArea, MovableView } from '@tarojs/components'

import '../../app.css'
import './Index.css'
import {fix, log, showError, showSuccess} from "../../utils";

// #region 书写注意
//
// 目前 typescript 版本还无法在装饰器模式下将 Props 注入到 Taro.Component 中的 props 属性
// 需要显示声明 connect 的参数类型并通过 interface 的方式指定 Taro.Component 子类的 props
// 这样才能完成类型检查和 IDE 的自动提示
// 使用函数模式则无此限制
// ref: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20796
//
// #endregion

type PageStateProps = {}

type PageDispatchProps = {}

type PageOwnProps = {}

type PageState = {}

type IProps = PageStateProps & PageDispatchProps & PageOwnProps

interface Index {
  props: IProps;
}

const recorderManager = Taro.getRecorderManager()
const innerAudioContext = Taro.createInnerAudioContext()
const screenHeight = Taro.getSystemInfoSync().windowHeight

class Index extends Component {
  state = {
    productId: this.$router.params['productId'],
    product: {},
    deadline: ['1天', '2天', '3天', '5天', '7天'],
    timeoutInIndex: 0,
    timeoutInDays: 1,
    userInfo: null,
    title: '',
    customerProductName: '',
    customerProductDescription: '',
    customerPrice: '',
    targetAmount: '',
    pickupLocation: '',
    movableViewPosition:{
      x:0,
      y:0
    },
    scrollPosition: {
      scrollTop: 0,
      scrollY: true
    },
    contents: [],
    localDisplayIndex: 0,
    groupDraft: null,
    sellerInfo: null,
    isOwn: parseInt(this.$router.params['isOwn']),
    playAudioNum: -1,
    showMobile: false,
    mobilePhone: '',
    address: '',
    selectedItem: {
      index: -1,
      positionY: 0,
    },
    selectedContent: {}
  }

  componentWillMount () { }

  onBackTo () {
    Taro.navigateBack({
      delta: 1
    })
  }

  selectDeadline (e) {
    let timeoutInIndex = e
    let timeoutInDays = this.state.timeoutInDays
    switch (timeoutInIndex) {
      case 0:
        timeoutInDays = 1
        break;
      case 1:
        timeoutInDays = 2
        break;
      case 2:
        timeoutInDays = 3
        break;
      case 3:
        timeoutInDays = 5
        break;
      case 4:
        timeoutInDays = 7
        break;
    }
    this.setState({
      timeoutInIndex: timeoutInIndex,
      timeoutInDays: timeoutInDays
    })
  }

  makePreview () {
    let {product, isOwn, contents,userInfo, customerProductName,customerProductDescription,customerPrice, targetAmount,timeoutInDays,pickupLocation,address,sellerInfo, mobilePhone} = this.state
    if (!userInfo) {
      showError('请授权获取你的微信头像与昵称')
      return
    }
    if (!customerProductName) {
      showError('请输入产品名称')
      return
    }
    if (!customerProductDescription) {
      showError('请输入产品简介')
      return
    }
    if (!customerPrice) {
      showError('请输入拼团售价')
      return
    }
    if (!targetAmount) {
      showError('请输入成团目标')
      return
    }
    if (!pickupLocation) {
      showError('请添加收获地址')
      return
    }
    if (!mobilePhone) {
      this.setState({
        showMobile: true
      })
      return
    }
    showSuccess('预览成功')
  }

  updateDraft () {
    showSuccess('保存成功')
  }

  updateCusProNName (e) {
    this.setState({
      customerProductName: e.detail.value
    })
  }

  updateCusProNDes (e) {
    this.setState({
      customerProductDescription: e.detail.value
    })
  }

  updateCustomerPrice (e) {
    this.setState({
      customerPrice: e.detail.value
    })
  }

  updateTargetAmount (e) {
    this.setState({
      targetAmount: e.detail.value
    })
  }

  chooseLocation () {
    let that = this
    Taro.chooseAddress({
      success (res) {
        log('address: ', res)
        let address = res.provinceName +'-'+ res.cityName +'-'+ res.countyName +'-'+ res.detailInfo
        that.setState({
          pickupLocation: address,
          address: address.replace(/-/g, '')
        })
      }, fail(err) {
        log('getAddress err:' , err)
      }
    })
  }

  cellHeight (content) {
    let num = 0
    if (content.contentType === 1) {
      num = content.subContents.length
    }
    if (content.contentType === 3 && content.contentUrl !=='') {
      num = 1
    }
    switch (content.contentType) {
      case 0:
        return this.cHW(174)
      case 1:
        if (num === 0) {
          return this.cHW(191)
        } else if (num <= 3) {
          return this.cHW(130.5)
        } else {
          return this.cHW(191)
        }
      case 2:
        return this.cHW(172)
      case 3:
        return num === 1? this.cHW(300) : this.cHW(172)
    }
    return 0
  }

  /**
   * 高转换
   */
  cHW(size) {
    return (size / 667) * screenHeight;
  }

  getPositionDomByXY (positionY) {
    log('positionY', positionY)
    log('this.state.scrollTop', this.state.scrollPosition.scrollTop)
    var y = positionY + this.state.scrollPosition.scrollTop - 300;
    let offY = 0
    let {contents} = this.state
    for(var i=0;i<contents.length;i++){
      if(y>= offY && y< offY + this.cellHeight(contents[i]) + this.cHW(20)){
        log('success', i)
        return {
          index: i,
          startY: offY,
          nowY: y
        }
      }
      offY = this.cellHeight(contents[i]) + this.cHW(20) + offY
    }
    log('getPositionDomByXY err', y)
    return {
      index: 0,
      startY: 0,
      nowY: 0
    }
  }

  touchStart (e) {
    log('touchStart', e)
    let start =  this.getPositionDomByXY(e.changedTouches[0].clientY)
    log('start', start)
    if (start.nowY - start.startY < this.cHW(40)) {
      this.setState({
        movableViewPosition:{
          x: 0,
          y: start.startY
        },
        scrollPosition: {
          scrollTop: this.state.scrollPosition.scrollTop,
          scrollY: false
        },
        selectedItem: {
          index: start.index,
          positionY: e.changedTouches[0].clientY
        },
        selectedContent: this.state.contents[start.index],
      })
    }
  }

  updateStatus = false

  touchMove (e) {
    let {contents, selectedItem, selectedContent, scrollPosition} = this.state
    let {index, positionY} = selectedItem
    if (!scrollPosition.scrollY) {
      let moveableY = e.changedTouches[0].clientY + scrollPosition.scrollTop - 300
      let moveDistance = e.changedTouches[0].clientY - positionY
      log('moveDistance', moveDistance)
      this.setState({
        movableViewPosition:{
          x: 0,
          y: moveableY
        }
      })
      if (moveDistance > 0 && index < contents.length -1  && !this.updateStatus) {
        let nextCellHeight = this.cellHeight(contents[index + 1])
        if (moveDistance >= nextCellHeight) {
          // 下移
          this.updateStatus = true
          if (contents[index].contentType === selectedContent.contentType)  {
            contents.splice(index, 1);
            contents.splice(++index, 0, selectedContent);
          }
          positionY += nextCellHeight;
          let that = this
          this.setState({
            contents: contents,
            selectedItem: {
              index: index,
              positionY: positionY
            }
          }, function () {
            that.updateStatus = false
          })
          log('下移', index)
        }
      }
      if (moveDistance < - this.cHW(20) && index > 0 && !this.updateStatus) {
        let preCellHeight = this.cellHeight(contents[index - 1])
        // 上移
        this.updateStatus = true
        if (contents[index].contentType === selectedContent.contentType) {
          contents.splice(index, 1);
          contents.splice(--index, 0, selectedContent);
        }
        positionY -= preCellHeight;
        let that = this
        this.setState({
          contents: contents,
          selectedItem: {
            index: index,
            positionY: positionY
          }
        }, function () {
          that.updateStatus = false
        })
        log('上移', index)
      }
    }
  }

  touchEnd () {
    log('touchEnd', 'touchEnd')
    this.setState({
      movableViewPosition:{
        x: 0,
        y: 0,
      },
      selectedItem: {
        index: -1,
        positionY: 0
      },
      scrollPosition: {
        scrollTop: this.state.scrollPosition.scrollTop,
        scrollY: true
      },
      selectedContent: {}
    })
  }

  bindscroll (e) {
    var scrollTop = e.detail.scrollTop;
    this.setState({
      scrollPosition: {
        scrollTop: scrollTop,
        scrollY: true
      }
    })
  }

  deleteItem (e) {
    let {contents} = this.state
    contents.splice(e, 1)
    this.setState({
      contents: contents
    })
  }

  autoAdd () {
    let {contents, localDisplayIndex, product} = this.state
    let subContents = []
    product.images.map((item, index) => {
      subContents.push({
        contentUrl: item,
        localDisplayIndex: index
      })
    })
    contents.push({
      contentType: 1,
      content: "",
      contentUrl: "",
      localDisplayIndex: localDisplayIndex,
      bundled: true,
      subContents:subContents
    })
    this.setState({
      contents: contents,
      localDisplayIndex: localDisplayIndex + 1
    })
  }

  addText () {
    let {contents, localDisplayIndex} = this.state
    contents.push({
      contentType: 0,
      content: "",
      contentUrl: "",
      localDisplayIndex: localDisplayIndex
    })
    this.setState({
      contents: contents,
      localDisplayIndex: localDisplayIndex + 1
    })
  }

  changeText (index, e) {
    log('index', index)
    let {contents} = this.state
    contents[index].content = e.detail.value
    this.setState({
      contents: contents
    })
  }

  addAudio () {
    let {contents, localDisplayIndex} = this.state
    contents.push({
      contentType: 2,
      content: "",
      contentUrl: "",
      contentDuration: 0,
      localDisplayIndex: localDisplayIndex,
    })
    this.setState({
      contents: contents,
      localDisplayIndex: localDisplayIndex + 1
    })
  }

  startAudio (e) {
    const options = {
      duration: 10000,//指定录音的时长，单位 ms
      sampleRate: 16000,//采样率
      numberOfChannels: 1,//录音通道数
      encodeBitRate: 96000,//编码码率
      format: 'mp3',//音频格式，有效值 aac/mp3
      frameSize: 50,//指定帧大小，单位 KB
    }
    //开始录音
    recorderManager.start(options);
    recorderManager.onStart(() => {
      console.log('recorder start')
    });
    //错误回调
    recorderManager.onError((res) => {
      console.log(res);
    })
  }

  stopAudio (e) {
    recorderManager.stop()
    let that = this
    let {contents} = this.state
    recorderManager.onStop(function (res) {
      log('stopAudio', res)
      const {tempFilePath, duration, fileSize} = res
      let second = fix(Math.floor((duration /1000 ) % 60), 2)
      let min = Math.floor(duration / 1000 / 60)
      // 注意这里需要 文件上传服务， 详见我的
      // https://blog.csdn.net/lunahaijiao/article/details/86575746
      contents[e].contentUrl = tempFilePath
      contents[e].content = min+':'+second
      contents[e].contentDuration = duration
      that.setState({
        contents: contents
      })
    })
  }

  clearAudio (e) {
    let {contents} = this.state
    contents[e].contentUrl = ''
    this.setState({
      contents: contents
    })
  }

  playAudio (e) {
    let {contents} = this.state
    let that = this
    innerAudioContext.src = contents[e].contentUrl
    innerAudioContext.play()
    innerAudioContext.onPlay(function () {
      that.setState({
        contents: contents,
        playAudioNum: e
      })
      console.log('开始播放')
    })
    innerAudioContext.onPause(function () {
      that.setState({
        contents: contents,
        playAudioNum: -1
      })
      console.log('暂停播放')
    })
    innerAudioContext.onStop(function () {
      that.setState({
        contents: contents,
        playAudioNum: -1
      })
      console.log('停止播放')
    })
    innerAudioContext.onEnded(function () {
      that.setState({
        contents: contents,
        playAudioNum: -1
      })
      console.log('结束播放')
    })
  }

  addImages () {
    let {contents, localDisplayIndex} = this.state
    contents.push({
      contentType: 1,
      content: "",
      contentUrl: "",
      localDisplayIndex: localDisplayIndex,
      bundled: true,
      subContents:[]
    })
    this.setState({
      contents: contents,
      localDisplayIndex: localDisplayIndex + 1
    })
  }

  addImage (e) {
    let that = this
    let contents = this.state.contents
    let index = e
    Taro.chooseImage({
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
    }).then(function (res) {
      // 注意这里需要 文件上传服务， 详见我的
      // https://blog.csdn.net/lunahaijiao/article/details/86575746
      let len = contents[index].subContents.length
      let newSub = res.map((item) => {
        return {
          "contentUrl":item.tempFilePath,
          "localDisplayIndex": ++len
        }
      })
      contents[index].subContents = contents[index].subContents.concat(newSub)
      that.setState({
        contents: contents
      })
    })
  }

  deleteImage (index, iindex) {
    let contents = this.state.contents
    contents[index].subContents.splice(iindex, 1)
    this.setState({
      contents: contents
    })
  }

  clearImage (e) {
    let contents = this.state.contents
    let index = e
    contents[index].subContents = []
    this.setState({
      contents: contents
    })
  }

  addVideo () {
    let {contents, localDisplayIndex} = this.state
    contents.push({
      contentType: 3,
      content: "",
      contentUrl: "",
      localDisplayIndex: localDisplayIndex
    })
    this.setState({
      contents: contents,
      localDisplayIndex: localDisplayIndex + 1
    })
  }

  clearVideo (e) {
    let contents = this.state.contents
    let index = e
    contents[index].contentUrl = ''
    this.setState({
      contents: contents
    })
  }

  addVideoV (e) {
    let index = e
    let that = this
    let {contents} = this.state
    Taro.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: ['front', 'back']
    }).then(function (res) {
      // 注意这里需要 文件上传服务， 详见我的
      // https://blog.csdn.net/lunahaijiao/article/details/86575746
      contents[index].contentUrl = res.tempFilePath
      that.setState({
        contents: contents
      })
    })
  }

  getPhone (e) {
    log('phone', e)
    let that = this
    // 手机号需要解密
    that.setState({
      mobilePhone: '17117708752',
      showMobile: false
    })
  }

  closeMobile () {
    this.setState({
      showMobile: false
    })
  }

  render () {
    let {deadline, product, userInfo, customerProductName, customerPrice, customerProductDescription, targetAmount, timeoutInIndex, pickupLocation,address, contents, movableViewPosition, isOwn, playAudioNum, showMobile, sellerInfo, selectedItem, scrollPosition, selectedContent} = this.state;
    return (
      <View className='white-bg flex-1 container flexDirection-c position-r pt-32 clear-padding'>
        <View className={'red-bg-1 pt-10 position-f base-width-12 left-none top-none'}>
          <View className={'height-22 flexDirection-r'}>
            <View className={'ph-10 base-height-12 flexDirection-c justifyContentCenter'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100} onClick={this.onBackTo.bind(this)}>
              <Image className={'d-b width-10 height-7'} mdoe={'aspectFit'} src={require('../../public/img/back.png')} />
            </View>
            <Text className={'flex-1 d-b fs-17 white-c lh-22'}>立即开团</Text>
          </View>
        </View>
        <View className={'flex-1 position-r flexDirection-c'}>
          <ScrollView className={'base-width-12 base-height-12'} scrollY={scrollPosition.scrollY} onScroll={this.bindscroll}>
            <View className={'pt-10 pb-10'}>
              <View className={'mb-8'}>
                <View className={'flexDirection-r alignItemsCenter'}>
                  <View className={'red-bg-1 width-2 height-7 mr-8'} />
                  <Text className={'d-b fs-14 cyan-c-1 lh-12'}>团购主题</Text>
                </View>
                <View className={'mh-10'}>
                  <View className={'flexDirection-r pv-8 alignItemsCenter '}>
                    <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12 text-overflow-h'}>已自动填入产品标题</Text>
                    <Image className={'d-b ic-finish mr-5'} mode={'aspectFit'} src={require('../../public/img/finish.png')} />
                  </View>
                  <View className={'finish-bd'} />
                </View>
                {/*获取头像和昵称呈现的状态*/}
                {userInfo ?
                  <View className={'mh-10'}>
                    <View className={'flexDirection-r pv-6 alignItemsCenter'}>
                      <Text className={'d-b fs-14 gray-c-19 opacity-14 lh-12'}>团长</Text>
                      <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12 text-overflow-h ml-6'}>{userInfo.nickName}</Text>
                      <Image className={'d-b width-18 height-18 ml-3'} mode={'aspectFill'} src={userInfo.avatarUrl} />
                    </View>
                    <View className={'finish-bd'} />
                  </View> :
                  <View className={'mh-10'}>
                    <Button className='flexDirection-r pv-8 alignItemsCenter justifyContentBetween white-bg clear-padding pl-none' hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100} openType='getUserInfo' onGetUserInfo={this.getUserInfo.bind(this)}>
                      <Text className='d-b flex-1 fs-14 gray-c-19 lh-12 text-overflow-h tx-l'>授权获得你的微信头像和昵称</Text>
                      <Image className={'d-b ic-personage mr-none'} mode={'aspectFit'} src={require('../../public/img/personage.png')} />
                    </Button>
                    <View className={'default-bd'} />
                  </View>
                }

              </View>
              <View className={'mb-8'}>
                <View className={'flexDirection-r alignItemsCenter mb-8'}>
                  <View className={'red-bg-1 width-2 height-7 mr-8'} />
                  <Text className={'d-b fs-14 cyan-c-1 lh-12'}>团购描述</Text>
                </View>
                <View className={'mh-10'}>
                  <View className={'position-r flex-1'}>
                    <View className='touchView' onTouchStart={this.touchStart} onTouchMove={this.touchMove} onTouchEnd={this.touchEnd}  />
                    {!scrollPosition.scrollY ?
                      <MovableArea className={'position-a base-width-12 base-height-12 top-none left-none' } style={'z-index:202'}>
                        <MovableView className='base-width-12' direction='vertical' inertia={false} damping={9999} friction={9999} y={movableViewPosition.y}>
                          {selectedContent.contentType === 0 &&
                          <View className={'flexDirection-c pa-8 pt-6 gray-bg-1 bdr-2 pb-10 mb-10'}>
                            <View className={'flexDirection-r alignItemsCenter mb-11'}>
                              <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加文字</Text>
                              <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                              </View>
                              <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                              </View>
                            </View>
                            <Textarea className={'fs-14 gray-c-19 lh-5 mt-none base-width-12 mb-6 textarea-v'}
                                      placeholderClass={'fs-14 gray-c-h-19'}
                                      placeholder={'请输入'}
                                      maxlength={1000}
                                      value={selectedContent.content}
                                      autoHeight={false}
                            />
                            <View className={(selectedContent.content ? 'finish-bd':'default-bd')} />
                          </View>
                          }
                          {
                            selectedContent.contentType === 2 &&
                            <View className={'flexDirection-c pa-8 pt-6 gray-bg-1 bdr-2 pb-10 mb-10'}>
                              <View className={'flexDirection-r alignItemsCenter mb-11'}>
                                <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加语音</Text>
                                <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                                </View>
                                <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                                </View>
                              </View>

                              {/*未添加语音的默认样式*/}
                              {
                                selectedContent.contentUrl ?
                                  <View className={'flexDirection-c'}>
                                    <View className={'pt-2 pr-31 pb-10 clear-padding'}>
                                      <View className={'flexDirection-r height-20 audio-v overflow-h'}>
                                        <View className={'flex-1 flexDirection-c left'}>
                                          <View className={'flex-1 flexDirection-r alignItemsCenter'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                            <Image className={'d-b ic-play ml-6'} mode={'aspectFit'} src={require('../../public/img/play_2.png')} />
                                          </View>
                                        </View>
                                        <View className={'flexDirection-c justifyContentEnd ph-6 pb-4 clear-padding'}>
                                          <Text className={'d-b fs-10 cyan-c-2 lh-6'}>{selectedContent.content}</Text>
                                        </View>
                                      </View>
                                    </View>
                                    <View className={'alignSelfEnd pt-3 pl-3'} style='z-index:201' hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                      <Text className={'d-b fs-14 red-c-1 lh-12'}>重新录制</Text>
                                    </View>
                                  </View> :
                                  <View className={'alignSelfCenter flexDirection-c alignItemsCenter pt-5'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                    <Image className={'d-b width-30 height-30 mb-4'} mode={'aspectFit'} src={require('../../public/img/voice.png')} />
                                    <Text className={'d-b fs-12 cyan-c-1 lh-8'}>按住开始录音</Text>
                                  </View>
                              }
                            </View>
                          }

                          {
                            selectedContent.contentType === 1 &&
                            <View className={'flexDirection-c pa-8 pt-6 gray-bg-1 bdr-2 pb-10 mb-10'}>
                              <View className={'flexDirection-r alignItemsCenter mb-11'}>
                                <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加图片（0/9）</Text>
                                <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                                </View>
                                <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                                </View>
                              </View>
                              {/*照片.length> 1 时  样式改为如下  并且  添加的照片.length<=3 的时候 height: calc(20vw - 22.5px)  else  height: calc(40vw - 37px)*/}
                              {
                                selectedContent.subContents && selectedContent.subContents.length > 0 ?
                                  <View className={'flexDirection-r flexWrapMore position-r img-more-v'} style={(selectedContent.subContents.length <= 3 ?'height: calc(20vw - 22.5px)':'height: calc(40vw - 37px)')}>
                                    {selectedContent.subContents.map((iitem, iindex) => {
                                      return (
                                        <View style='z-index:201' className={'position-r mr-4 mb-4 add-img'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                          <Image className={'d-b base-width-12 base-height-12'} mode={'aspectFill'} src={iitem.contentUrl} />
                                          <View className={'position-a pa-1 pl-4 pb-4 top-none right-none'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                            <Image className={'d-b width-6 height-6'} mode={'aspectFit'} src={require('../../public/img/delete.png')} />
                                          </View>
                                        </View>
                                      )
                                    })}

                                    {/*添加照片的这个按钮在添加了第九张图片后 hidden  如果小于九张就显示 */}
                                    {
                                      selectedContent.subContents.length < 9 ?
                                        <View style='z-index:201' className={'mr-4 mb-4 add-img add-img-s'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                          <Image className={'d-b base-width-12 base-height-12'} mode={'aspectFill'} src={'https://miaowuhui-01-1257236255.cos.ap-shanghai.myqcloud.com/wx_images/add_img.png'} />
                                        </View> : null
                                    }
                                    <View className={'position-a bottom-none right-4 pt-3 pl-3'} style='z-index:201' hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                      <Text className={'d-b fs-14 red-c-1 lh-12'}>清除</Text>
                                    </View>
                                  </View>
                                  :
                                  <View className={'alignSelfCenter pt-18 pb-12'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                    <Image className={'d-b add-img add-img-s'} mode={'aspectFit'} src={'https://miaowuhui-01-1257236255.cos.ap-shanghai.myqcloud.com/wx_images/add_img.png'} />
                                  </View>
                              }
                            </View>
                          }
                          {selectedContent.contentType === 3 &&
                          <View className={'flexDirection-c pa-8 pt-6 gray-bg-1 bdr-2 pb-10 mb-10'}>
                            <View className={'flexDirection-r alignItemsCenter mb-11'}>
                              <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加视频</Text>
                              <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                              </View>
                              <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                              </View>
                            </View>

                            {/*未添加视频时的默认状态*/}
                            {
                              selectedContent.contentUrl ?
                                <View className={'flexDirection-c'}>
                                  <Video  className={'base-width-12 bdr-4 h388 overflow-h'}
                                          src={selectedContent.contentUrl}
                                          controls={true}
                                          autoplay={false}
                                          poster={require('../../public/img/play.png')}
                                          initialTime={'0'}
                                          loop={false}
                                          muted={false}
                                  />
                                  <View className={'alignSelfEnd pt-6 pl-3'} style='z-index:201' hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                    <Text className={'d-b fs-14 red-c-1 lh-8'}>重新录制</Text>
                                  </View>
                                </View>
                                :
                                <View style='z-index:201' className={'alignSelfCenter flexDirection-c alignItemsCenter pt-5'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Image className={'d-b width-30 height-30 mb-4'} mode={'aspectFit'} src={require('../../public/img/video.png')} />
                                  <Text className={'d-b fs-12 cyan-c-1 lh-8'}>点击添加</Text>
                                </View>
                            }
                          </View>
                          }
                        </MovableView>
                      </MovableArea> : null
                    }
                    {contents && contents.map((item, index) => {
                      return (
                        <View>
                          {item.contentType === 0 &&
                          <View className={selectedItem.index === index ? 'flexDirection-c pa-8 pt-6 bdr-2 pb-10 mb-10 gray-bg-8':'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 pb-10 mb-10'}>
                            <View className={'flexDirection-r alignItemsCenter mb-11'}>
                              <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加文字</Text>
                              <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} onClick={this.deleteItem.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                              </View>
                              <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                              </View>
                            </View>
                            <Textarea className={'fs-14 gray-c-19 lh-5 mt-none base-width-12 mb-6 textarea-v'}
                                      placeholderClass={'fs-14 gray-c-h-19'}
                                      placeholder={'请输入'}
                                      maxlength={1000}
                                      value={item.content}
                                      onInput={this.changeText.bind(this, index)}
                                      autoHeight={false}
                            />
                            <View className={(item.content ? 'finish-bd':'default-bd')} />
                          </View>
                          }
                          {
                            item.contentType === 2 &&
                            <View className={selectedItem.index === index ? 'flexDirection-c pa-8 pt-6 bdr-2 pb-10 mb-10 gray-bg-8':'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 pb-10 mb-10'}>
                              <View className={'flexDirection-r alignItemsCenter mb-11'}>
                                <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加语音</Text>
                                <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} onClick={this.deleteItem.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                                </View>
                                <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                                </View>
                              </View>

                              {/*未添加语音的默认样式*/}
                              {
                                item.contentUrl ?
                                  <View className={'flexDirection-c'}>
                                    <View className={'pt-2 pr-31 pb-10 clear-padding'}>
                                      <View className={'flexDirection-r height-20 audio-v overflow-h'}>
                                        <View className={'flex-1 flexDirection-c left'}>
                                          <View className={'flex-1 flexDirection-r alignItemsCenter'} onClick={this.playAudio.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                            {
                                              !(playAudioNum === index) ?
                                                <Image className={'d-b ic-play ml-6'} mode={'aspectFit'} src={require('../../public/img/play_2.png')} />
                                                : <Image className={'d-b ic-play ml-6'} mode={'aspectFit'} src={require('../../public/img/pause.png')} />
                                            }
                                          </View>
                                        </View>
                                        <View className={'flexDirection-c justifyContentEnd ph-6 pb-4 clear-padding'}>
                                          <Text className={'d-b fs-10 cyan-c-2 lh-6'}>{item.content}</Text>
                                        </View>
                                      </View>
                                    </View>
                                    <View className={'alignSelfEnd pt-3 pl-3'} onClick={this.clearAudio.bind(this, index)} style='z-index:201' hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                      <Text className={'d-b fs-14 red-c-1 lh-12'}>重新录制</Text>
                                    </View>
                                  </View> :
                                  <View className={'alignSelfCenter flexDirection-c alignItemsCenter pt-5'} onTouchStart={this.startAudio.bind(this, index)} onTouchEnd={this.stopAudio.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                    <Image className={'d-b width-30 height-30 mb-4'} mode={'aspectFit'} src={require('../../public/img/voice.png')} />
                                    <Text className={'d-b fs-12 cyan-c-1 lh-8'}>按住开始录音</Text>
                                  </View>
                              }
                            </View>
                          }

                          {
                            item.contentType === 1 &&
                            <View className={selectedItem.index === index ? 'flexDirection-c pa-8 pt-6 bdr-2 pb-10 mb-10 gray-bg-8':'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 pb-10 mb-10'}>
                              <View className={'flexDirection-r alignItemsCenter mb-11'}>
                                <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加图片（0/9）</Text>
                                <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} onClick={this.deleteItem.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                                </View>
                                <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                                </View>
                              </View>
                              {/*照片.length> 1 时  样式改为如下  并且  添加的照片.length<=3 的时候 height: calc(20vw - 22.5px)  else  height: calc(40vw - 37px)*/}
                              {
                                item.subContents && item.subContents.length > 0 ?
                                  <View className={'flexDirection-r flexWrapMore position-r img-more-v'} style={(item.subContents.length <= 3 ?'height: calc(20vw - 22.5px)':'height: calc(40vw - 37px)')}>
                                    {item.subContents.map((iitem, iindex) => {
                                      return (
                                        <View style='z-index:201' className={'position-r mr-4 mb-4 add-img'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                          <Image className={'d-b base-width-12 base-height-12'} mode={'aspectFill'} src={iitem.contentUrl} />
                                          <View className={'position-a pa-1 pl-4 pb-4 top-none right-none'} onClick={this.deleteImage.bind(this, index, iindex)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                            <Image className={'d-b width-6 height-6'} mode={'aspectFit'} src={require('../../public/img/delete.png')} />
                                          </View>
                                        </View>
                                      )
                                    })}

                                    {/*添加照片的这个按钮在添加了第九张图片后 hidden  如果小于九张就显示 */}
                                    {
                                      item.subContents.length < 9 ?
                                        <View style='z-index:201' className={'mr-4 mb-4 add-img add-img-s'} onClick={this.addImage.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                          <Image className={'d-b base-width-12 base-height-12'} mode={'aspectFill'} src={'https://miaowuhui-01-1257236255.cos.ap-shanghai.myqcloud.com/wx_images/add_img.png'} />
                                        </View> : null
                                    }
                                    <View className={'position-a bottom-none right-4 pt-3 pl-3'} onClick={this.clearImage.bind(this, index)} style='z-index:201' hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                      <Text className={'d-b fs-14 red-c-1 lh-12'}>清除</Text>
                                    </View>
                                  </View>
                                  :
                                  <View className={'alignSelfCenter pt-18 pb-12'} onClick={this.addImage.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                    <Image className={'d-b add-img add-img-s'} mode={'aspectFit'} src={'https://miaowuhui-01-1257236255.cos.ap-shanghai.myqcloud.com/wx_images/add_img.png'} />
                                  </View>
                              }
                            </View>
                          }
                          {item.contentType === 3 &&
                          <View className={selectedItem.index === index ? 'flexDirection-c pa-8 pt-6 bdr-2 pb-10 mb-10 gray-bg-8':'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 pb-10 mb-10'}>
                            <View className={'flexDirection-r alignItemsCenter mb-11'}>
                              <Text className={'d-b flex-1 fs-14 gray-c-19 lh-12'}>添加视频</Text>
                              <View className={'ph-4 height-11 bdr-2 yellow-bg-1 ml-8'} onClick={this.deleteItem.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>移除</Text>
                              </View>
                              <View className={'ph-4 height-11 bdr-2 blue-bg-7 ml-8'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                <Text className={'d-b fs-11 white-c lh-11'}>拖拽</Text>
                              </View>
                            </View>

                            {/*未添加视频时的默认状态*/}
                            {
                              item.contentUrl ?
                                <View className={'flexDirection-c'}>
                                  <Video  className={'base-width-12 bdr-4 h388 overflow-h'}
                                          src={item.contentUrl}
                                          controls={true}
                                          autoplay={false}
                                          poster={require('../../public/img/play.png')}
                                          initialTime={'0'}
                                          loop={false}
                                          muted={false}
                                  />
                                  <View className={'alignSelfEnd pt-6 pl-3'} style='z-index:201' onClick={this.clearVideo.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                    <Text className={'d-b fs-14 red-c-1 lh-8'}>重新录制</Text>
                                  </View>
                                </View>
                                :
                                <View style='z-index:201' className={'alignSelfCenter flexDirection-c alignItemsCenter pt-5'} onClick={this.addVideoV.bind(this, index)} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                                  <Image className={'d-b width-30 height-30 mb-4'} mode={'aspectFit'} src={require('../../public/img/video.png')} />
                                  <Text className={'d-b fs-12 cyan-c-1 lh-8'}>点击添加</Text>
                                </View>
                            }
                          </View>
                          }
                        </View>
                      )
                    })}
                  </View>
                  <View className={'flexDirection-r mb-10'}>
                    <View className={'flex-1 flexDirection-c alignItemsCenter'} onClick={this.autoAdd} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                      <Image className={'d-b width-20 height-20 mb-6'} mode={'aspectFit'} src={require('../../public/img/auto.png')} />
                      <Text className={'d-b tx-c fs-12 cyan-c-1 lh-8'}>自动添加</Text>
                    </View>
                    <View className={'flex-1 flexDirection-c alignItemsCenter'} onClick={this.addText} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                      <Image className={'d-b width-20 height-20 mb-6'} mode={'aspectFit'} src={require('../../public/img/text.png')} />
                      <Text className={'d-b tx-c fs-12 cyan-c-1 lh-8'}>添加文字</Text>
                    </View>
                    <View className={'flex-1 flexDirection-c alignItemsCenter'} onClick={this.addAudio} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                      <Image className={'d-b width-20 height-20 mb-6'} mode={'aspectFit'} src={require('../../public/img/voice.png')} />
                      <Text className={'d-b tx-c fs-12 cyan-c-1 lh-8'}>添加语音</Text>
                    </View>
                    <View className={'flex-1 flexDirection-c alignItemsCenter'} onClick={this.addImages} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                      <Image className={'d-b width-20 height-20 mb-6'} mode={'aspectFit'} src={require('../../public/img/ic_img.png')} />
                      <Text className={'d-b tx-c fs-12 cyan-c-1 lh-8'}>添加照片</Text>
                    </View>
                    <View className={'flex-1 flexDirection-c alignItemsCenter'} onClick={this.addVideo} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                      <Image className={'d-b width-20 height-20 mb-6'} mode={'aspectFit'} src={require('../../public/img/video.png')} />
                      <Text className={'d-b tx-c fs-12 cyan-c-1 lh-8'}>添加视频</Text>
                    </View>
                  </View>
                  <View className={'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 mb-10'}>
                    <Text className={'d-b fs-14 gray-c-19 lh-12 mb-6'}>货源信息</Text>
                    <View className={'flexDirection-r'}>
                      <Image className={'d-b white-bg width-18 height-18 mr-6'} mode={'aspectFit'} src={product.images[0]} />
                      <View className={'flex-1'}>
                        <Text className={'d-b fs-12 gray-c-22 opacity-16 lh-8 text-overflow-h-2 mb-4'}>{product.name}</Text>
                        <View className={'flexDirection-r flexWrapMore'}>
                          {isOwn ?
                            <View className={'red-bg-1 height-11 ph-4 bdr-2 mb-6 mr-3'}>
                              <Text className={'d-b fs-11 white-c lh-11'}>自有产品</Text>
                            </View>:
                            <View className={'flexDirection-r fs-11 gray-c-22 lh-7 opacity-12 mb-4'}>
                              <Text className={'d-b'}>卖家店铺：</Text>
                              <Text className={'d-b flex-1'}>{sellerInfo.sellerName}</Text>
                            </View>
                          }
                        </View>
                        <View className={'flexDirection-r alignItemsEnd'}>
                          <Text className={'d-b fs-12 gray-c-22 lh-9'}>进货价：</Text>
                          <Text className={'d-b fs-19 yellow-c-1 lh-11'}>{(parseFloat(product.orderUnitPrice)/100).toFixed(2)}</Text>
                          <Text className={'d-b fs-10 gray-c-22 lh-9 ml-2'}>¥/{product.salesUnitName}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View className={'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 pb-10 mb-10'}>
                    <Text className={'d-b fs-14 gray-c-19 lh-12'}>给客户看的信息</Text>
                    <View className={'pt-6'}>
                      <Text className={'d-b fs-14 cyan-c-1 lh-12'}>产品名称</Text>
                      <View className={'flexDirection-c'}>
                        <Input type='text'
                               placeholder='请输入'
                               placeholderClass={'fs-14 gray-c-h-19'}
                               value={customerProductName}
                               onInput={this.updateCusProNName}
                               className={'base-width-12 transparent-bg height-16 pb-6 fs-14 gray-c-19 clear-padding'}
                        />
                        <View className={(customerProductName? 'finish-bd' : 'default-bd')} />
                      </View>
                    </View>
                    <View className={'pt-6'}>
                      <Text className={'d-b fs-14 cyan-c-1 lh-12'}>产品简介</Text>
                      <View className={'flexDirection-c'}>
                        <Input type='text'
                               placeholder='请输入'
                               value={customerProductDescription}
                               onInput={this.updateCusProNDes}
                               placeholderClass={'fs-14 gray-c-19 opacity-10'}
                               className={'base-width-12 transparent-bg height-16 pb-6 fs-14 gray-c-19 clear-padding'}
                        />
                        <View className={(customerProductDescription? 'finish-bd' : 'default-bd')} />
                      </View>
                    </View>
                    <View className={'pt-6'}>
                      <Text className={'d-b fs-14 cyan-c-1 lh-12'}>拼团售价</Text>
                      <View className={'flexDirection-c'}>
                        <Input type='number'
                               placeholder='请输入'
                               value={customerPrice}
                               onInput={this.updateCustomerPrice}
                               placeholderClass={'fs-14 gray-c-h-19'}
                               className={'base-width-12 transparent-bg height-16 pb-6 fs-14 gray-c-19 clear-padding'}
                        />
                        <View className={(customerPrice? 'finish-bd' : 'default-bd')} />
                      </View>
                    </View>
                  </View>
                  <View className={'flexDirection-c pa-8 pt-6 gray-bg-v-1 bdr-2 pb-10 mb-10'}>
                    <Text className={'d-b fs-14 gray-c-19 lh-12'}>团购设置</Text>
                    <View className={'pt-6'}>
                      <Text className={'d-b fs-14 cyan-c-1 lh-12 mb-3'}>团购期限</Text>
                      <View className={'flexDirection-r mr24'}>
                        {
                          deadline.map((item, index)=>{
                            return(
                              <View className={'flex-1 ba-blue-3 height-14 bdr-2 mr-6 ' + ( timeoutInIndex===index ? 'blue-bg-6' : 'white-bg')} key={index} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100} onClick={this.selectDeadline.bind(this,index)}>
                                <Text className={'d-b tx-c fs-13 gray-c-20 lh-14'}>{item}</Text>
                              </View>
                            )
                          })
                        }

                      </View>
                    </View>
                    <View className={'pt-6'}>
                      <Text className={'d-b fs-14 cyan-c-1 lh-12'}>成团目标</Text>
                      <View className={'flexDirection-c'}>
                        <Input type='text'
                               placeholder='请输入'
                               value={targetAmount}
                               onInput={this.updateTargetAmount}
                               placeholderClass={'fs-14 gray-c-h-19'}
                               className={'base-width-12 transparent-bg height-16 pb-6 fs-14 gray-c-19 clear-padding'}
                        />
                        <View className={(targetAmount ? 'finish-bd': 'default-bd')} />
                      </View>
                    </View>
                    <View className={''}>
                      <View className={'flexDirection-r alignItemsCenter pt-6 pb-6'} onClick={this.chooseLocation}>
                        <View className={'flex-1 flexDirection-c mr-3'}>
                          <Text className={'d-b fs-14 cyan-c-1 lh-12'}>取货地址</Text>
                          <Text className={'d-b fs-14 gray-c-19' + (pickupLocation ? '' : 'opacity-10')}>{pickupLocation ? address : '添加收货地址'}</Text>
                        </View>
                        <Image className={'d-b ic-right'} mode={'aspectFit'} src={require('../../public/img/right_1.png')} />
                      </View>
                      <View className={(pickupLocation? 'finish-bd':'default-bd')} />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
        <View className={'gray-bg-5 bt-gray-11 flexDirection-r height-24 '}>
          <View className={'flex-1 flexDirection-r'}>
            <View className={'flex-1 '} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100} onClick={this.updateDraft.bind(this)}>
              <Text className={'d-b tx-c fs-17 red-c-1 lh-24'}>保存草稿</Text>
            </View>
          </View>
          <View className={'flex-1 red-bg-1'} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100} onClick={this.makePreview.bind(this)}>
            <Text className={'d-b tx-c fs-17 white-c lh-24'}>生成预览</Text>
          </View>
        </View>

        <View className={'position-f base-width-12 base-height-12 all-none flexDirection-c justifyContentCenter ph-24 clear-padding'} style={'z-index:299'} hidden={!showMobile}>
          <View className={'position-a base-width-12 base-height-12 all-none mask-bg-16'} />
          <View className={'position-r white-bg bdr-6 overflow-h mask-shadow-1'}>
            <View className={'flexDirection-c bb-gray-5'}>
              <Text className={'d-b fs-16 gray-c-19 lh-11 mh-10 mt-12 mb-20'}>需要提供手机号码，方便参团用户联系你！</Text>

            </View>
            <View className={'flexDirection-r alignItemsCenter height-24'}>
              <View className={'flex-1 flexDirection-c alignItemsCenter justifyContentCenter'} onClick={this.closeMobile} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                <Text className={'d-b fs-16 gray-c-11 lh-8'}>返回</Text>
              </View>
              <Button className={'flex-1 transparent-bg bdr-none flexDirection-c alignItemsCenter justifyContentCenter'} openType='getPhoneNumber' onGetPhoneNumber={this.getPhone} hoverClass={'opacity-10'} hoverStartTime={0} hoverStayTime={100}>
                <Text className={'d-b fs-16 blue-c-3 fw-5 lh-8'}>授权</Text>
              </Button>
            </View>
          </View>
        </View>
      </View>
    )
  }
}

// #region 导出注意
//
// 经过上面的声明后需要将导出的 Taro.Component 子类修改为子类本身的 props 属性
// 这样在使用这个子类时 Ts 才不会提示缺少 JSX 类型参数错误
//
// #endregion

export default Index as ComponentClass<PageOwnProps, PageState>
