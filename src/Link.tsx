import * as React from 'react'
import {history} from './history'

export interface LinkProps {
  href: string
  target?: '_blank' | '_self' | undefined
  Component?: string | React.ComponentClass
  onClick?(e: MouseEvent): boolean | void
}

export class Link extends React.Component<LinkProps> {
  handleClick = (e: MouseEvent) => {
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
