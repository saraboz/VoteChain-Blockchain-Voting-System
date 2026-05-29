import React from 'react';
import logo from '../assets/bigo.png';

const Footer = () => {
  return (
    <footer className="footer_section bg-indigo-900 text-indigo-400 mx-auto mx-6xl">
      <div className="footer_top flex flex-row justify-between items-center content-center max-w-[1300px] mx-auto  mx-4 md:mx-16 lg:mx-64 py-8">
        <div className="logo  flex flex-row">
          <a href="~/Home/Index">
            <img src={logo} alt="VoteChain Logo" className="w-1/3" />
          </a>
        </div>
        <ul className="icons flex space-x-8 text-2xl">
          <li>
            <a href="#" className="text-indigo-400 hover:text-indigo-400 transition">
              <i className="fab fa-twitter"></i>
            </a>
          </li>
          <li>
            <a href="#" className="text-indigo-400 hover:text-indigo-400 transition">
              <i className="fab fa-facebook"></i>
            </a>
          </li>
          <li>
            <a href="#" className="text-indigo-400 hover:text-indigo-400 transition">
              <i className="fab fa-linkedin"></i>
            </a>
          </li>
          <li>
            <a href="#" className="text-indigo-400 hover:text-indigo-400 transition">
              <i className="fab fa-instagram"></i>
            </a>
          </li>
          <li>
            <a href="#" className="text-indigo-400 hover:text-indigo-400 transition">
              <i className="fab fa-github"></i>
            </a>
          </li>
        </ul>
      </div>

      <div className="bg-[#100e28] footer_bottom py-12 border-t border-gray-500 ">
        <div className="inner_footer items-center text-gray-100 max-w-[1500px] mx-auto   grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
          <div>
            <h5 className="footer-middle-title text-lg font-bold mb-4 relative text-gray-200">
              COMPANY
              <div className="h-1 w-12 bg-amber-200 mt-2 mx-auto md:mx-0"></div>
            </h5>
            <div className="space-y-2 mt-4">
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Home</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">How It Works</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Contact Us</a>
            </div>
          </div>

          <div>
            <h5 className="footer-middle-title text-lg font-bold mb-4 relative text-gray-200">
              LEGAL
              <div className="h-1 w-8 bg-amber-200 mt-2 mx-auto md:mx-0"></div>
            </h5>
            <div className="space-y-2">
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Terms of Service</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Privacy Policy</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Issue Disclosure Policy</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Security Statement</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Accessibility</a>
            </div>
          </div>

          <div>
            <h5 className="footer-middle-title text-lg font-bold mb-4 relative text-gray-200">
              SECURITY & TECHNOLOGY
              <div className="h-1 w-8 bg-amber-200 mt-2 mx-auto md:mx-0"></div>
            </h5>
            <div className="space-y-2">
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Our Approach</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Bug Bounty Program</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Security Audits</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Whitepapers</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Check the Facts</a>
            </div>
          </div>

          <div>
            <h5 className="footer-middle-title text-lg font-bold mb-4 relative text-gray-200">
              RESOURCES
              <div className="h-1 w-8 bg-amber-200 mt-2 mx-auto md:mx-0"></div>
            </h5>
            <div className="space-y-2">
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">FAQ</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Blog</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Support</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Partners & Affiliates</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Media</a>
              <a href="#" className="block text-md hover:text-indigo-400 transition no-underline text-indigo-200">Jobs</a>
            </div>
          </div>
        </div>
      </div>

      <div className="py-4 bg-[#100e28] border-t-2 border-gray-700">
        <div className="flex flex-col md:flex-row items-center justify-center font-bold mx-4 md:mx-16 lg:mx-64">
          <p className="text-sm mb-2 md:mb-0">
            © 2025 <a href="#" className=" no-underline text-indigo-400">VoteChain</a>. All rights reserved.
          </p>
          
        </div>
      </div>
    </footer>
  );
};

export default Footer;