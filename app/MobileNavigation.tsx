'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

type Props = { onGive: () => void; onAccount: () => void; accountOpen: boolean };
const sections = ['top', 'causes', 'impact'];

export default function MobileNavigation({ onGive, onAccount, accountOpen }: Props) {
  const [active, setActive] = useState('top');

  useEffect(() => {
    const syncHash = () => {
      const id = window.location.hash.slice(1);
      if (sections.includes(id)) setActive(id);
    };
    const frame = requestAnimationFrame(syncHash);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    for (const id of sections) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    window.addEventListener('hashchange', syncHash);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('hashchange', syncHash);
    };
  }, []);

  const link = (id: string, label: string, icon: string) => <a href={`#${id}`} aria-current={!accountOpen && active === id ? 'location' : undefined} onClick={() => setActive(id)}><span className="mobile-nav-icon" aria-hidden="true"><Icon name={icon}/></span><span className="mobile-nav-label">{label}</span></a>;

  return <nav className="mobile-nav refined-mobile-nav" aria-label="Mobile navigation">
    {link('top', 'Home', 'home')}
    {link('causes', 'Explore', 'search')}
    <button className="mobile-give" onClick={onGive} aria-label="Give a donation"><span className="mobile-nav-icon" aria-hidden="true"><Icon name="giving"/></span><span className="mobile-nav-label">Give</span></button>
    {link('impact', 'Impact', 'shield')}
    <button onClick={onAccount} aria-expanded={accountOpen} className={accountOpen ? 'is-active' : undefined}><span className="mobile-nav-icon" aria-hidden="true"><Icon name="wallet"/></span><span className="mobile-nav-label">Account</span></button>
  </nav>;
}
