/* tslint:disable:no-floating-promises no-shadowed-variable */
import * as React from 'react'
import {string2string, EventEmitter, queryToObject} from './utils'
import {history} from './history'

type Unpacked<T> =
    T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
    T extends Promise<infer U> ? U :
    T

interface EasyReactRouterProps {
  initLocation?: string
  alias?: string2string
  resolve(pageFolderName: string): Promise<any> | any // TODO: not clean
}

interface EasyReactRouterState {
  loading: boolean
  pageInfo: {data: any, key: string | null}[]
}

export interface EasyReactRouterComponentProps<P = {[key: string]: Promise<any>}> {
  pathname: string
  query: string2string
  hash: string2string
  resolving?: {[k in keyof P]: Unpacked<P[k]>} | null
}

export class EasyReactRouter extends React.Component<EasyReactRouterProps, EasyReactRouterState> {
  static itemClassName = 'EasyReactRouterItem'

  currentPages: ValidEasyReactRouterComponent[] = []
  pageNodes: HTMLElement[] = []
  queue: {location: string, isForward: boolean} | null = null
  state = {
    loading: false,
    pageInfo: [] as EasyReactRouterState['pageInfo'],
  }

  constructor(props: EasyReactRouterProps) {
    super(props)
    if (props.initLocation) { // server render
      this.parseForNode(props.initLocation)
    } else {
      this.state = {
        loading: true,
        pageInfo: [],
      }
    }
  }

  componentDidMount() {
    const {initLocation} = this.props
    if (!initLocation) { // client render
      this.parse(window.location.href)
    }
    window.addEventListener('popstate', this.goBack)
    EventEmitter.addEventListener('pushstate', this.reFind)
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.goBack)
    EventEmitter.removeEventListener('pushstate', this.reFind)
  }

  goBack = (e: PopStateEvent) => {
    const isForward = history.isLastUrl(e)
    this.reFind(isForward)
    history.unsafe_setLength(history.length + (isForward ? 1 : -1))
  }

  insertQueue(location: string, isForward: boolean) {
    this.queue = {location, isForward}
  }

  checkQueue(currentLocation: string) {
    if (this.queue && this.queue.location !== currentLocation) {
      const target = this.queue
      this.queue = null
      requestAnimationFrame(() => {
        this.parse(target.location, target.isForward)
      })
    } else if (this.queue) {
      this.queue = null
    }
  }

  reFind = (isForwoard = true) => {
    this.parse(window.location.href, isForwoard)
  }

  parseForNode(path: string) {
    const {resolve} = this.props
    const locationObject = this.findLocation(path)
    const pageFolderName = this.getPageFolderName(locationObject)
    let page = resolve(pageFolderName)
    if (!page) {
      throw new Error('NotFound')
    }
    page = page.default

    this.currentPages = [page]
    this.state.pageInfo = [{
      key: this.getComponentKey(locationObject),
      data: {
        query: queryToObject(locationObject.search),
        hash: queryToObject(locationObject.hash),
        pathname: locationObject.pathname.slice(1),
      },
    }]
  }

  parse = async (location: string, isForward = true) => {
    const {page, data, key} = await this.findTargetPage(location)

    if (!page) {
      this.currentPages = []
      this.setState({loading: false, pageInfo: []})
      return
    }
    if (this.currentPages.length === 2) { // animating
      this.insertQueue(location, isForward)
      return
    }

    const currentPage = this.currentPages[0]
    const setFinal = () => {
      return new Promise<void>(resolve => {
        this.currentPages = this.currentPages.slice(0, 1)
        this.pageNodes = this.pageNodes.slice(0, 1)
        this.setState({
          loading: false,
          pageInfo: this.state.pageInfo.slice(0, 1),
        }, resolve)
      })
    }

    if (!currentPage) { // no need for animation
      this.currentPages = [page]
      this.setState({
        loading: false,
        pageInfo: [{data, key}],
      })
    } else if (
      // If history go forward, next page must have enterAnim
      // or if history go backward, current page must have popExitAnim
      // otherwise skip all animation
      (isForward && !page.enterAnim) ||
      (!isForward && !currentPage.popExitAnim)
    ) {
      this.currentPages = [page]
      this.setState({
        loading: false,
        pageInfo: [{data, key}],
      })
    } else {
      this.currentPages = [page].concat(this.currentPages)

      this.setState({
        pageInfo: [{data, key}].concat(this.state.pageInfo),
      }, () => {
        if (isForward) {
          page.enterAnim!(this.pageNodes[0]).then(() => {
            return setFinal()
          }).then(() => {
            this.pageNodes[0].className = EasyReactRouter.itemClassName
            this.checkQueue(location)
          })
          if (currentPage.exitAnim) {
            currentPage.exitAnim(this.pageNodes[1])
          }
        } else {
          currentPage.popExitAnim!(this.pageNodes[1]).then(() => {
            return setFinal()
          }).then(() => {
            this.pageNodes[0].className = EasyReactRouter.itemClassName
            this.checkQueue(location)
          })
          if (page.popEnterAnim) {
            page.popEnterAnim(this.pageNodes[0])
          }
        }
      })
      return
    }
  }

  findLocation(location: string): URL {
    const {alias} = this.props
    const locationObject = new URL(location, 'http://whatever/')
    if (alias) {
      if (alias) {
        const currentPathName = locationObject.pathname
        Object.keys(alias).some(re => {
          let targetRe = re
          if (!targetRe.endsWith('$')) {
            targetRe = `${targetRe}$`
          }
          if (!targetRe.startsWith('^')) {
            targetRe = `^${targetRe}`
          }
          const aliasRe = new RegExp(targetRe, 'ig')
          const replaced = currentPathName.replace(aliasRe, alias[re])
          if (replaced !== currentPathName) {
            const [path, search] = replaced.split('?')
            locationObject.pathname = path
            locationObject.search += `&${search || ''}`
            return true
          }
          return false
        })
      }
    }
    return locationObject
  }

  getPageFolderName(locationObject: URL) {
    return locationObject.pathname.slice(1).replace(/\//ig, '-')
  }

  getComponentKey(locationObject: URL) {
    return `${locationObject.pathname}-${locationObject.search}-${locationObject.hash}}`
  }

  async findTargetPage(location: string, originError?: any)
    : Promise<{
      page: ValidEasyReactRouterComponent | null,
      data: EasyReactRouterComponentProps | null,
      key: string | null,
  }> {
    const {resolve} = this.props

    const locationObject = this.findLocation(location)
    const pathname = locationObject.pathname.slice(1)
    const pageFolderName = this.getPageFolderName(locationObject)

    const data: EasyReactRouterComponentProps = {
      query: queryToObject(locationObject.search),
      hash: queryToObject(locationObject.hash),
      pathname,
    }

    return Promise.resolve(resolve(pageFolderName)).then(res => {
      if (!res || !res.default) {
        throw new Error('NotFound')
      }
      const page = res.default as ValidEasyReactRouterComponent

      return {
        page,
        data: {
          ...data,
          resolving: page.resolve ? page.resolve(data) : null,
        },
        key: this.getComponentKey(locationObject),
      }
    }).catch(e => {
      if (pathname !== '404') {
        return this.findTargetPage('/404', e)
      } else {
        console.error(originError || e)
        return {page: null, data: null, key: null}
      }
    })
  }

  render() {
    const {loading, pageInfo} = this.state
    if (loading || !this.currentPages.length) return null

    return (
      <div className="EasyReactRouter">
        {this.currentPages.map((Page, index) => (
          <div
            key={pageInfo[index].key || ''}
            className={EasyReactRouter.itemClassName}
            ref={el => this.pageNodes[index] = el!}
          >
            <Page {...pageInfo[index].data} />
          </div>
        ))}
      </div>
    )
  }
}

export class EasyReactRouterComponent<P = {}, S = {}, SS = any>
  extends React.Component<P & EasyReactRouterComponentProps, S, SS> {
  static enterAnim?: Animation
  static exitAnim?: Animation
  static popEnterAnim?: Animation
  static popExitAnim?: Animation
  static resolve?: Resolver
}

export interface EasyReactRouterComponentClass<P = {}, S = {}>
  extends React.ComponentClass<P & EasyReactRouterComponentProps, S> {
  enterAnim?: Animation
  exitAnim?: Animation
  popEnterAnim?: Animation
  popExitAnim?: Animation
  resolve?: Resolver
}

export interface FunctionEasyReactRouterComponent<P = {}>
  extends React.FunctionComponent<P & EasyReactRouterComponentProps> {
  enterAnim?: Animation
  exitAnim?: Animation
  popEnterAnim?: Animation
  popExitAnim?: Animation
  resolve?: Resolver
}

type ValidEasyReactRouterComponent = EasyReactRouterComponentClass | FunctionEasyReactRouterComponent

export type Animation = (node: HTMLElement) => Promise<void>

export type Resolver = (props: EasyReactRouterComponentProps) => {[key: string]: Promise<any>}
