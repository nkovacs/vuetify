function style (el, value) {
  [
    'transform',
    'webkitTransform'
  ].forEach(i => {
    el.style[i] = value
  })
}

const ripple = {
  /**
   * @param {Event} e
   * @return { x,y : number }
   */
  getEventPos: (e, boundingRect) => {
    let touch
    if (e.changedTouches && e.changedTouches.length > 0) {
      touch = e.changedTouches[0]
    } else if (e.touches && e.touches.length > 0) {
      touch = e.touches[0]
    }
    if (e.clientX !== undefined && e.clientY !== undefined) {
      touch = e
    }
    if (touch) {
      return {
        x: touch.clientX,
        y: touch.clientY
      }
    }
    return {
      x: boundingRect.left + boundingRect.width / 2,
      y: boundingRect.top + boundingRect.height / 2
    }
  },
  /**
   * @param {Event} e
   * @param {Element} el
   * @param {{ class?: string, center?: boolean }} [value={}]
   */
  show: (e, el, value = {}) => {
    if (!el.__ripple || !el.__ripple.enabled) {
      return
    }

    const container = document.createElement('span')
    const animation = document.createElement('span')

    container.appendChild(animation)
    container.className = 'ripple__container'

    if (value.class) {
      container.className += ` ${value.class}`
    }

    const size = el.clientWidth > el.clientHeight
      ? el.clientWidth
      : el.clientHeight
    animation.className = 'ripple__animation'
    animation.style.width = `${size * (value.center ? 1 : 2)}px`
    animation.style.height = animation.style.width

    el.appendChild(container)
    const computed = window.getComputedStyle(el)
    if (computed.position !== 'absolute' && computed.position !== 'fixed') el.style.position = 'relative'

    const offset = el.getBoundingClientRect()
    const loc = value.center ? false : ripple.getEventPos(e, offset)
    const x = loc ? `${loc.x - offset.left}px` : '50%'
    const y = loc ? `${loc.y - offset.top}px` : '50%'

    animation.classList.add('ripple__animation--enter')
    animation.classList.add('ripple__animation--visible')
    style(animation, `translate(-50%, -50%) translate(${x}, ${y}) scale3d(0.01,0.01,0.01)`)
    animation.dataset.activated = Date.now()

    setTimeout(() => {
      animation.classList.remove('ripple__animation--enter')
      style(animation, `translate(-50%, -50%) translate(${x}, ${y})  scale3d(0.99,0.99,0.99)`)
    }, 0)
  },

  hide: (el) => {
    if (!el.__ripple || !el.__ripple.enabled) {
      return
    }

    const ripples = el.getElementsByClassName('ripple__animation')

    if (ripples.length === 0) return
    const animation = ripples[ripples.length - 1]
    const diff = Date.now() - Number(animation.dataset.activated)
    let delay = 400 - diff

    delay = delay < 0 ? 0 : delay

    setTimeout(() => {
      animation.classList.remove('ripple__animation--visible')

      setTimeout(() => {
        // Need to figure out a new way to do this
        try {
          if (ripples.length < 1) el.style.position = null
          animation.parentNode && el.removeChild(animation.parentNode)
        } catch (e) {}
      }, 300)
    }, delay)
  }
}

function isRippleEnabled (value) {
  return typeof value === 'undefined' || !!value
}

function isSyntheticEvent (el, e) {
  const sc = e.sourceCapabilities
  if (sc && !sc.firesTouchEvents) {
    return false
  }
  if (el.__preventSyntheticMouseEvents) {
    return true
  }
  return false
}

function preventSyntheticEvent (el) {
  el.__preventSyntheticMouseEvents = true
  setTimeout(() => {
    delete el.__preventSyntheticMouseEvents
  }, 2500)
}

function rippleShow (e) {
  const value = {}
  const element = e.currentTarget
  if (e.type === 'mousedown' && isSyntheticEvent(element, e)) {
    return
  }
  value.center = element.__ripple.centered
  if (element.__ripple.class) {
    value.class = element.__ripple.class
  }
  ripple.show(e, element, value)
}

function rippleHide (e) {
  if (e.type === 'touchend') {
    preventSyntheticEvent(e.currentTarget)
  }
  ripple.hide(e.currentTarget)
}

function updateRipple (el, binding, wasEnabled) {
  const enabled = isRippleEnabled(binding.value)
  if (!enabled) {
    ripple.hide(el)
  }
  el.__ripple = el.__ripple || {}
  el.__ripple.enabled = enabled
  const value = binding.value || {}
  if (value.center) {
    el.__ripple.centered = true
  }
  if (value.class) {
    el.__ripple.class = binding.value.class
  }
  if (enabled && !wasEnabled) {
    if ('ontouchstart' in window) {
      el.addEventListener('touchstart', rippleShow, false)
      el.addEventListener('touchend', rippleHide, false)
      el.addEventListener('touchcancel', rippleHide, false)
    }

    el.addEventListener('mousedown', rippleShow, false)
    el.addEventListener('mouseup', rippleHide, false)
    el.addEventListener('mouseleave', rippleHide, false)
    // Anchor tags can be dragged, causes other hides to fail - #1537
    el.addEventListener('dragstart', rippleHide, false)
  } else if (!enabled && wasEnabled) {
    removeListeners(el)
  }
}

function removeListeners (el) {
  el.removeEventListener('touchstart', rippleShow, false)
  el.removeEventListener('mousedown', rippleShow, false)
  el.removeEventListener('touchend', rippleHide, false)
  el.removeEventListener('touchcancel', rippleHide, false)
  el.removeEventListener('mouseup', rippleHide, false)
  el.removeEventListener('mouseleave', rippleHide, false)
  el.removeEventListener('dragstart', rippleHide, false)
}

function directive (el, binding) {
  updateRipple(el, binding, false)
}

function unbind (el, binding) {
  delete el.__ripple
  removeListeners(el)
}

function update (el, binding) {
  if (binding.value === binding.oldValue) {
    return
  }

  const wasEnabled = isRippleEnabled(binding.oldValue)
  updateRipple(el, binding, wasEnabled)
}

export default {
  name: 'ripple',
  bind: directive,
  unbind: unbind,
  update: update
}
