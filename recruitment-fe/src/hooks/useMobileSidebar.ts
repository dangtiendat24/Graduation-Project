import { useState } from 'react'
import { useLocation } from 'react-router-dom'

/** Sidebar mobile: đóng drawer mỗi khi chuyển trang (điều chỉnh state ngay trong render). */
export function useMobileSidebar() {
  const { pathname } = useLocation()
  const [isOpen, setOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)

  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return { isOpen, setOpen }
}
