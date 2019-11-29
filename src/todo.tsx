import { useModel } from "./useModel";
import { uuid } from "uuidv4";
import React, { useState } from "react";
import { $enum } from "ts-enum-util";
import styled from "styled-components";
import { Flex } from "rebass";
interface Item {
  text: string;
  done: boolean;
  id: string;
}

const Todo = styled.div<{ done: boolean }>`
  text-decoration: ${p => (p.done ? "line-through" : "none")};
`;
const TodoItem = ({
  item,
  handleToggle
}: {
  item: Item;
  handleToggle: (id: string) => void;
}) => {
  return (
    <Todo done={item.done} key={item.id} onClick={() => handleToggle(item.id)}>
      {item.text}
    </Todo>
  );
};
enum FilterType {
  ALL,
  ACTIVE,
  DONE
}
const initState = {
  filter: FilterType.ALL,
  todolist: [
    {
      text: "react",
      done: false,
      id: uuid()
    },
    {
      text: "vue",
      done: true,
      id: uuid()
    }
  ] as Item[]
};
export const TodoApp = () => {
  // local ui状态
  const [value, setValue] = useState("");
  // 业务模型数据
  const [{ filteredList }, { setState, toggle, addTodo }] = useModel({
    name: "todo",
    state: initState,
    computed: {
      filteredList() {
        return this.todolist.filter(x => {
          switch (this.filter) {
            case FilterType.ALL:
              return true;
            case FilterType.ACTIVE:
              return !x.done;
            case FilterType.DONE:
              return x.done;
            default:
              throw new Error("non exist");
          }
        });
      }
    },
    reducers: {
      toggle(id: string) {
        this.todolist
          .filter(x => x.id === id)
          .forEach(x => {
            x.done = !x.done;
          });
      },
      setFilter(filter: FilterType) {
        this.filter = filter;
      },
      addTodo(text: string) {
        this.todolist.push({
          text,
          done: false,
          id: uuid()
        });
      }
    }
  });
  return (
    <div>
      <form
        onSubmit={e => {
          e.preventDefault();
          addTodo(value);
        }}
      >
        <input value={value} onChange={e => setValue(e.target.value)} />
        {filteredList.map(x => (
          <TodoItem item={x} handleToggle={toggle} />
        ))}
        <Flex>
          {$enum(FilterType).map(x => {
            return (
              <div
                style={{ marginLeft: 10 }}
                onClick={() => setState(s => (s.filter = x))}
                key={x}
              >
                {FilterType[x]}
              </div>
            );
          })}
        </Flex>
      </form>
    </div>
  );
};
