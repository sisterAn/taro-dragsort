import Taro from '@tarojs/taro'

export function log(tag = '', content) {
  if (process.env.NODE_ENV === 'development') {
    console.log("==========================================", tag)
    console.log(content);
    console.log("==========================================")
  }
}
export function logString(tag = '', content) {
  if (process.env.NODE_ENV === 'production') {
    console.log("==========================================", tag)
    console.log(JSON.stringify(content))
    console.log("==========================================")
  }
}



export const showModel = (title, content) => {
  Taro.showModal({
    title,
    content: typeof content == 'string' ? content : JSON.stringify(content),
    showCancel: false
  })
}

export const showLoading = (title, mask = true) => {
  Taro.showLoading({
    title: title || '加载中',
    mask: mask
  })
}

export const hideLoading = () => {
  Taro.hideLoading()
}

// 显示失败提示
export const showError = (error = '网络异常', duration = 1200, icon = 'none') => {
  Taro.showToast({
    title: error || '数据错误',
    duration: duration,
    icon: icon,
  })
}

// 显示成功提示
export const showSuccess = text => Taro.showToast({
  title: text || '',
  icon: 'success'
})

// 手机号处理183****2695
export const mobileHideCenter = mobile => {
  return mobile.substr(0, 3) + '****' + mobile.substr(7)
}

/**
 *获取文件扩展名
 * @param filename  文件全名
 * @returns {string|*}  文件扩展名
 */
export function get_suffix(filename) {
  let pos = filename.lastIndexOf('.');
  let suffix = ''
  if (pos != -1) {
    suffix = filename.substring(pos)
  }
  return suffix;
}


/**
 * 获取表示全局唯一标识符 (GUID)
 * @param len   GUID的长度
 * @param radix 用几进制来表示
 * @returns {string}    GUID
 * @constructor
 */
let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
export function GUID(len, radix) {
  var uuid = [], i;
  radix = radix || chars.length;
  if (len) {
    // Compact form
    for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
  } else {
    // rfc4122, version 4 form
    var r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | Math.random() * 16;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
  }
  return uuid.join('');
}

export function fix(num, length) {
  return ('' + num).length < length ? ((new Array(length + 1)).join('0') + num).slice(-length) : '' + num;
}







