import React from 'react'

function Select({ name, defaultValue = 0, onChange }) {
    return (
        <select 
            className={`score ${name}`} 
            defaultValue={defaultValue}
            onChange={onChange}
        >
            {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                    {i || '0'}
                </option>
            ))}
        </select>
    )
}

export default Select
