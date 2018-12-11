import {EventEmitter} from './utils'

class History {
  _length = 0
  _lasttm: number | null = null
  back() {
    this.go(-1)
  }
  go(len: number): void {
    window.history.go(len)
    this._length = Math.max(0, this._length - len)
  }
  push(url: string): void {
    this._length += 1
    const tm = Date.now()
    this._lasttm = tm
    window.history.pushState({
      tm,
    }, '', url)
    EventEmitter.dispatchEvent('pushstate')
  }
  isLastUrl(e: PopStateEvent) {
    if (!e.state) return false
    return e.state.tm === this._lasttm
  }
  get length() {
    return this._length
  }
  set length(_) {
    throw new Error('history.length is readonly')
  }
  unsafe_setLength(len: number) {
    this._length = len
  }
}

export const history = new History()
