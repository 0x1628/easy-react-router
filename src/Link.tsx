import * as React from 'react'
import {history} from './history'

export interface LinkProps extends React.HTMLProps<any> {
  href: string
  target?: '_blank' | '_self' | undefined
  Component?: string | React.ComponentType<any>
  onClick?(e: React.MouseEvent): boolean | void
  [key: string]: any
}

export class Link extends React.Component<LinkProps> {
  handleClick = (e: React.MouseEvent) => {
    const {onClick, href, target} = this.props
    e.preventDefault()
    if (onClick) {
      if (onClick(e)) {
        return
      }
    }

    const url = new URL(href, location.origin)
    if (url.origin !== location.origin) {
      location.href = href
      return
    }

    if (target === '_blank') {
      window.open(href)
    } else {
      history.push(`${url.pathname}${url.search}${url.hash}`)
    }
  }

  render() {
    const {
      href,
      target,
      children,
      Component,
      onClick,
      ...rest} = this.props

    const TargetComponent = Component || 'a'
    return (
      <TargetComponent
        onClick={this.handleClick}
        href={href}
        target={target}
        {...rest}
      >
        {children}
      </TargetComponent>
    )
  }
}
