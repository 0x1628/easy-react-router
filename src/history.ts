import {EventEmitter} from './utils'

type ChangeListner = () => void

class History {
  length = 0
  _lasttm: number | null = null
  _changeListeners: ChangeListner[] = []
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
    this.unsafe_fireChange()
  }
  replace(url: string): void {
    const tm = Date.now()
    this._lasttm = tm
    window.history.replaceState({
      tm,
    }, '', url)
    EventEmitter.dispatchEvent('pushstate')
    this.unsafe_fireChange()
  }
  isLastUrl(e: PopStateEvent) {
    if (!e.state) return false
    return e.state.tm === this._lasttm
  }
  unsafe_setLength(len: number) {
    this.length = len
  }
  unsafe_fireChange() {
    this._changeListeners.forEach(item => item())
  }
  addChangeListener(callback: ChangeListner) {
    this._changeListeners.push(callback)
  }
}

export const history = new History()

// tslint:disable-next-line
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('popstate', () => {
    history.unsafe_fireChange()
  })
}
