import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "@/lib/GameContext";
import "@/App.css";

import NewGame from "@/pages/NewGame";
import GameLayout from "@/pages/GameLayout";
import WorldMap from "@/pages/WorldMap";
import Dashboard from "@/pages/Dashboard";
import CityDetail from "@/pages/CityDetail";
import CharacterSheet from "@/pages/CharacterSheet";
import Inventory from "@/pages/Inventory";
import NPCList from "@/pages/NPCList";
import NPCDetail from "@/pages/NPCDetail";
import Relationships from "@/pages/Relationships";
import Chronicle from "@/pages/Chronicle";
import Battle from "@/pages/Battle";
import School from "@/pages/School";
import Opportunities from "@/pages/Opportunities";
import WorldNews from "@/pages/WorldNews";
import Factions from "@/pages/Factions";
import Social from "@/pages/Social";
import Rumors from "@/pages/Rumors";
import StatAllocate from "@/pages/StatAllocate";
import Marry from "@/pages/Marry";
import Profession from "@/pages/Profession";
import Crime from "@/pages/Crime";
import Trade from "@/pages/Trade";
import Generation from "@/pages/Generation";
import TownFeed from "@/pages/TownFeed";
import Properties from "@/pages/Properties";
import StoryJournal from "@/pages/StoryJournal";
import Legacy from "@/pages/Legacy";

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/yeni-oyun" replace />} />
          <Route path="/yeni-oyun" element={<NewGame />} />
          <Route path="/oyun" element={<GameLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="harita" element={<WorldMap />} />
            <Route path="sehir/:id" element={<CityDetail />} />
            <Route path="karakter" element={<CharacterSheet />} />
            <Route path="envanter" element={<Inventory />} />
            <Route path="npcler" element={<NPCList />} />
            <Route path="npc/:id" element={<NPCDetail />} />
            <Route path="iliskiler" element={<Relationships />} />
            <Route path="tarih" element={<Chronicle />} />
            {/* GDD §20: gorevler ve aile sayfaları kaldırıldı, redirect */}
            <Route path="gorevler" element={<Navigate to="/oyun/firsatlar" replace />} />
            <Route path="aile" element={<Navigate to="/oyun/iliskiler" replace />} />
            <Route path="savas" element={<Battle />} />
            <Route path="mektep" element={<School />} />
            <Route path="firsatlar" element={<Opportunities />} />
            <Route path="dunya-haberleri" element={<WorldNews />} />
            <Route path="factionlar" element={<Factions />} />
            <Route path="sosyal" element={<Social />} />
            <Route path="dedikodular" element={<Rumors />} />
            <Route path="statlar" element={<StatAllocate />} />
            <Route path="evlilik" element={<Marry />} />
            <Route path="meslek" element={<Profession />} />
            <Route path="suc" element={<Crime />} />
            <Route path="ticaret" element={<Trade />} />
            <Route path="nesil" element={<Generation />} />
            <Route path="kasaba" element={<TownFeed />} />
            <Route path="mulkler" element={<Properties />} />
            <Route path="hikayeler" element={<StoryJournal />} />
            <Route path="hanedan" element={<Legacy />} />
          </Route>
          <Route path="*" element={<Navigate to="/oyun" replace />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
