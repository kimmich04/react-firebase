import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../Firebase";
import './App.scss';
import "@fortawesome/fontawesome-free/css/all.min.css";

function App() {
    return (
        <div className="App">
            <Navbar />
            <div className="main-content">
            </div>
        </div>
    );
}

export default App;
