import React, { useState } from 'react';
import { db } from '../Firebase';
import { collection, addDoc } from 'firebase/firestore';

function CreateTodo(props) {
    const [Subject, setSubject] = useState("");
    const handleSubmit = (e) => {
        e.preventDefault();
        if (Subject !== "") {
            addDoc(collection(db, "todos"), {
                Subject,
                completed: false,
            });
            setSubject("");
        }
    }
    return (
        <form onSubmit={handleSubmit}>
            <div className="input-container">
                <input type="text"
                    placeholder='what do you want to do?'
                    value={Subject}
                    onChange={(e) => setSubject(e.target.value)}
                />
            </div>
            <div className="btn-container">
        <button>Add-Todo</button>
      </div>
        </form>
    );
}
export default CreateTodo;