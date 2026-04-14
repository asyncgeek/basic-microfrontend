import React, { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { dispatch } from "./events";

const POKEMONS = [
  { id: 1, name: "Bulbasaur", type: "Grass", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
  { id: 4, name: "Charmander", type: "Fire", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
  { id: 7, name: "Squirtle", type: "Water", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" },
  { id: 25, name: "Pikachu", type: "Electric", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" },
  { id: 39, name: "Jigglypuff", type: "Normal", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png" },
  { id: 63, name: "Abra", type: "Normal", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/63.png" },
  { id: 94, name: "Gengar", type: "Poison", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png" },
  { id: 133, name: "Eevee", type: "Normal", image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" },
];

const TYPES = ["Fire", "Water", "Grass", "Electric", "Normal", "Poison"];

const TYPE_COLORS = {
  Fire: { bg: "#ff6b6b", text: "white" },
  Water: { bg: "#4dabf7", text: "white" },
  Grass: { bg: "#69db7c", text: "white" },
  Electric: { bg: "#ffd43b", text: "#333" },
  Normal: { bg: "#a9a9a9", text: "white" },
  Poison: { bg: "#da77f2", text: "white" },
};

export function Dashboard() {
  const [selectedType, setSelectedType] = useState("");

  const filteredPokemons = useMemo(() => {
    if (!selectedType) return POKEMONS;
    return POKEMONS.filter((p) => p.type === selectedType);
  }, [selectedType]);

  return (
    <div style={{ padding: "20px" }}>
      <header style={{ background: "#3f51b5", color: "white", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
        <h1>Dashboard Microfrontend</h1>
      </header>

      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#3f51b5" }}>{POKEMONS.length}</span>
          <br />
          <span style={{ color: "#666", fontSize: "0.875rem" }}>Total Pokémon</span>
        </div>
        <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
          <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#3f51b5" }}>{selectedType || "Todos"}</span>
          <br />
          <span style={{ color: "#666", fontSize: "0.875rem" }}>Tipo Filtrado</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type === selectedType ? "" : type)}
            style={{
              padding: "8px 16px",
              border: "none",
              borderRadius: "20px",
              background: selectedType === type ? "#3f51b5" : "#e0e0e0",
              color: selectedType === type ? "white" : "#333",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {type}
          </button>
        ))}
        <button
          onClick={() => setSelectedType("")}
          style={{
            padding: "8px 16px",
            border: "none",
            borderRadius: "20px",
            background: !selectedType ? "#3f51b5" : "#e0e0e0",
            color: !selectedType ? "white" : "#333",
            cursor: "pointer",
          }}
        >
          Todos
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px" }}>
        {filteredPokemons.map((pokemon) => {
          const colors = TYPE_COLORS[pokemon.type] || TYPE_COLORS.Normal;
          return (
            <div
              key={pokemon.id}
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                transition: "transform 0.2s",
              }}
            >
              <img src={pokemon.image} alt={pokemon.name} style={{ width: "80px", height: "80px" }} />
              <h3 style={{ margin: "8px 0", textTransform: "capitalize" }}>{pokemon.name}</h3>
              <p style={{ margin: "4px 0", color: "#666" }}>${pokemon.id}</p>
              <button
                onClick={() => dispatch("pokemon:selected", { ...pokemon, price: pokemon.id })}
                style={{
                  marginTop: "8px",
                  padding: "6px 12px",
                  background: "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Agregar
              </button>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  background: colors.bg,
                  color: colors.text,
                }}
              >
                {pokemon.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;

let appRef = null;

export async function mount(element) {
  const container = document.createElement("div");
  element.appendChild(container);
  
  appRef = createRoot(container);
  appRef.render(<Dashboard />);

  return () => {
    appRef?.unmount();
    element.innerHTML = "";
  };
}
