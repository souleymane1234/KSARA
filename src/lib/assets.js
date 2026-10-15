import logo from '../assets/images/logo.png';
import apt_chambre from '../assets/images/apt_chambre.jpg';
import apt_piece from '../assets/images/apt_piece.jpg';
import apt_salon from '../assets/images/apt_salon.jpg';
import apt_sdb from '../assets/images/apt_sdb.jpg';
import bv_facade from '../assets/images/bv_facade.jpg';
import bv_terrasse from '../assets/images/bv_terrasse.jpg';
import bv_villa from '../assets/images/bv_villa.jpg';
import bv_vue from '../assets/images/bv_vue.jpg';
import imm_douche from '../assets/images/imm_douche.jpg';
import imm_facade from '../assets/images/imm_facade.jpg';
import imm_sdb from '../assets/images/imm_sdb.jpg';
import std_cuisine from '../assets/images/std_cuisine.jpg';
import std_salon from '../assets/images/std_salon.jpg';
import std_terrasse from '../assets/images/std_terrasse.jpg';
import vc_piscine from '../assets/images/vc_piscine.jpg';
import vc_salon from '../assets/images/vc_salon.jpg';
import vc_salon2 from '../assets/images/vc_salon2.jpg';
import vc_sejour from '../assets/images/vc_sejour.jpg';
import villa_piscine from '../assets/images/villa_piscine.jpg';
import poster from '../assets/images/poster.jpg';

export const LOGO = logo;

export const PHOTOS = {
  apt_chambre,
  apt_piece,
  apt_salon,
  apt_sdb,
  bv_facade,
  bv_terrasse,
  bv_villa,
  bv_vue,
  imm_douche,
  imm_facade,
  imm_sdb,
  std_cuisine,
  std_salon,
  std_terrasse,
  vc_piscine,
  vc_salon,
  vc_salon2,
  vc_sejour,
  villa_piscine,
  poster
};

export const ph = k => !k ? "" : String(k).startsWith("data:") ? k : (PHOTOS[k] || "");
