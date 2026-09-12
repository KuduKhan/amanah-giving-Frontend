'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import AmanahLogo from './AmanahLogo';

type Props = {
  labels: { causes: string; zakat: string; impact: string; how: string; sign: string; give: string };
  language: 'en' | 'sw' | 'ar';
  onLanguage: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  onAccount: () => void;
  onGive: () => void;
  onPlatform: () => void;
};

export default function SiteHeader({ labels, language, onLanguage, onSearch, onNotifications, onAccount, onGive, onPlatform }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('top');
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const links = [
    { id: 'causes', label: labels.causes, icon: 'heart' },
    { id: 'zakat', label: labels.zakat, icon: 'giving' },
    { id: 'impact', label: labels.impact, icon: 'shield' },
    { id: 'how', label: labels.how, icon: 'book' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-15% 0px -60% 0px', threshold: 0 });
    ['top', 'causes', 'zakat', 'impact', 'how'].forEach(id => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    const desktop = window.matchMedia('(min-width: 1280px)');
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      desktop.removeEventListener('change', resize);
    };
  }, [menuOpen]);

  const run = (action: () => void) => { setMenuOpen(false); action(); };
  const nextLanguage = language === 'en' ? 'Kiswahili' : language === 'sw' ? 'Arabic' : 'English';

  return <header className="site-header premium-header" ref={header} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
  }}>
    <a className="brand" href="#top" onClick={() => setMenuOpen(false)} aria-label="Amanah Giving home"><AmanahLogo size="md"/></a>
    <nav className="desktop-links" aria-label="Main navigation">
      {links.map(link => <a key={link.id} href={`#${link.id}`} aria-current={active === link.id ? 'location' : undefined}><Icon name={link.icon}/>{link.label}</a>)}
      <button className="nav-platform" onClick={onPlatform}><Icon name="platform"/>Platform</button>
    </nav>
    <div className="header-actions">
      <button className="header-icon" onClick={onSearch} aria-label="Search campaigns" title="Search campaigns"><Icon name="search"/></button>
      <button className="header-icon notification-trigger" onClick={onNotifications} aria-label="Open notifications, 3 unread" title="Notifications"><Icon name="bell"/><span className="notification-dot"/></button>
      <button className="header-language" onClick={onLanguage} aria-label={`Switch to ${nextLanguage}`} title={`Switch to ${nextLanguage}`}><Icon name="globe"/><span>{language.toUpperCase()}</span></button>
      <span className="header-divider" aria-hidden="true"/>
      <button className="account-link" onClick={onAccount}><Icon name="wallet"/>{labels.sign}</button>
      <button className="button button-small header-give" onClick={onGive}>{labels.give}<Icon name="↗"/></button>
      <button className="header-icon menu-trigger" ref={menuButton} aria-expanded={menuOpen} aria-controls="navigation-menu" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'}/></button>
    </div>
    {menuOpen && <div id="navigation-menu" className="navigation-menu">
      <p className="menu-eyebrow">EXPLORE AMANAH</p>
      <nav aria-label="Expanded navigation">
        {links.map(link => <a key={link.id} href={`#${link.id}`} aria-current={active === link.id ? 'location' : undefined} onClick={() => setMenuOpen(false)}><Icon name={link.icon}/><span>{link.label}</span><Icon name="→"/></a>)}
        <button onClick={() => run(onPlatform)}><Icon name="platform"/><span>Platform</span><Icon name="→"/></button>
        <button onClick={() => run(onAccount)}><Icon name="wallet"/><span>{labels.sign}</span><Icon name="→"/></button>
      </nav>
      <div className="menu-footer"><span><Icon name="shield"/>Verified giving. Visible impact.</span><button className="button" onClick={() => run(onGive)}>{labels.give}<Icon name="↗"/></button></div>
    </div>}
  </header>;
}
