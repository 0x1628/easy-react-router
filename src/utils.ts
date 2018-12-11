export type string2string = {
  [key: string]: string,
}

type string2any = {
  [key: string]: any,
}

// tslint:disable:no-invalid-this
export const EventEmitter =  {
  _events: {} as string2any,

  addEventListener(ename: string, callback: any) {
    if (!this._events[ename]) {
      this._events[ename] = []
    }
    this._events[ename].push(callback)
  },

  removeEventListener(ename: string, callback: any) {
    if (!this._events[ename]) return
    this._events[ename] = this._events[ename].filter((i: any) => i !== callback)
  },

  dispatchEvent(ename: string) {
    const events = this._events[ename]
    if (events && events.length) {
      events.forEach((e: any) => e())
    }
  },
}
// tslint:enable:no-invalid-this

export const queryToObject = (query: string): string2string => {
  if (query.startsWith('?') || query.startsWith('#')) {
    query = query.slice(1)
  }

  return query.split('&').reduce((target, next) => {
    const [key, value] = next.split('=')
    if (!key) return target
    target[key] = value || ''
    return target
  }, {} as string2string)
}
