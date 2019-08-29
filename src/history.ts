import {EventEmitter} from './utils'

class History {
  length = 0
  _lasttm: number | null = null
  back() {
    this.go(-1)
  }
  go(len: number): void {
    window.history.go(len)
    this.length = Math.max(0, this.length - len)
  }
  push(url: string): void {
    this.length += 1
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
  unsafe_setLength(len: number) {
    this.length = len
  }
}

export const history = new History()
