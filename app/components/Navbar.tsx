import type { JSX } from "react";
const Navbar = (): JSX.Element => {


    
    return (
<nav className="navbar">
    <a href="/">
        <p className="text-2xl font-bold text-gradient">RESUMIND</p>
    </a>
        <a href="/upload" className="primary-button w-fit">Upload Resume</a>
    </nav>
    )
}
export default Navbar;
