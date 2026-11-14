import { Link, NavLink, useNavigate } from 'react-router-dom';

// Kept as the single link/navigate entry point for public pages. Navigation is instant: no morph, no page animation.
export const useViewNavigate = useNavigate;
export const ViewLink = Link;
export const ViewNavLink = NavLink;
