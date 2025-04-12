import React, { useEffect, useState } from "react";
import TodoSubject from "../Components/TodoSubject";
import CreateTodo from "../Components/CreateTodo";
import Todo from "../Components/Todo";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { db } from "../Firebase";
import './App.scss';

function App() {
    const [todos, setTodos] = useState([]);

    // Fetch todos from Firestore
    useEffect(() => {
        const q = query(collection(db, "todos"));
        const unsub = onSnapshot(q, (querySnapshot) => {
            let todosArray = [];
            querySnapshot.forEach((doc) => {
                todosArray.push({ ...doc.data(), id: doc.id });
            });
            setTodos(todosArray);
        });
        return () => unsub();
    }, []);

    // Add todo
    const addTodo = async (Subject) => {
        await addDoc(collection(db, "todos"), {
            Subject: Subject,
            completed: false,
        });
    };

    // Edit todo
    const handleEdit = async (todo, Subject) => {
        await updateDoc(doc(db, "todos", todo.id), { Subject: Subject });
    };

    // Toggle completion
    const toggleComplete = async (todo) => {
        await updateDoc(doc(db, "todos", todo.id), { completed: !todo.completed });
    };

    // Delete todo
    const handleDelete = async (id) => {
        await deleteDoc(doc(db, "todos", id));
    };

    return (
        <div className="App">
            <TodoSubject />
            <CreateTodo addTodo={addTodo} />
            <div className="todo-list">
                {todos.map((todo) => (
                    <Todo
                        key={todo.id}
                        todo={todo}
                        toggleComplete={toggleComplete}
                        handleEdit={handleEdit}
                        handleDelete={handleDelete}
                    />
                ))}
            </div>
        </div>
    );
}

export default App;