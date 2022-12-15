local p = {}

local getArgs = require("Module:Arguments").getArgs

local DATA = mw.text.jsonDecode(mw.title.new("Module:BACharInfo/data"):getContent())

function p.main(frame)
    local parent = frame:getParent()
    if parent and parent:getTitle() == "Template:蔚蓝档案学生" then
        frame = parent
    end
    return p._main(getArgs(frame))
end

function p._main(args)
    if not args.name then
        error("未指定学生姓名")
    end
    local dat = DATA[args.Name]
    if not dat then
        error("未找到学生" .. args.Name .. "的信息")
    end
    
end
